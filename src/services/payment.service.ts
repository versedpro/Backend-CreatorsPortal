import { OrganizationInfo } from '../interfaces/organization';
import { Logger } from '../helpers/Logger';
import { KnexHelper } from '../helpers/knex.helper';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { PaymentPurpose, PreBillingResponse, StripeCard } from '../interfaces/stripe.card';
import Stripe from 'stripe';
import { nodeEnv, stripeConfig } from '../constants';
import { NftCollectionStatus } from '../interfaces/collection';
import { callContract } from './collection.service';
import { PaymentActive, PaymentMethod, PaymentStatus } from '../interfaces/PaymentRequest';

// Create stripe payment client
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2022-08-01',
});

const PRODUCT_ID = nodeEnv === 'production' ? 'CREATORS_PORTAL' : `CREATORS_PORTAL_${nodeEnv}`;

export async function getCustomerId(param: { userId: string, email?: string }): Promise<string> {
  const { userId, email } = param;
  let stripeCustomerId = await KnexHelper.getStripeCustomerId(userId);
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: {
        organization_id: userId,
      }
    });
    stripeCustomerId = customer.id;
    await KnexHelper.saveStripeCustomerId({
      organizationId: userId,
      customerId: stripeCustomerId,
    });
  }
  return stripeCustomerId;
}

export async function getCreatorOrganization(id: string): Promise<OrganizationInfo> {
  Logger.Info('Getting Creator...', id);
  const result = await KnexHelper.getOrganizationInfo({ id });
  if (result.length > 0) {
    return result[0] as OrganizationInfo;
  }
  throw new CustomError(StatusCodes.NOT_FOUND, 'User not found');
}

export async function getUserCards(userId: string): Promise<StripeCard[]> {
  Logger.Info('Getting User Cards...', userId);
  const organization = await getCreatorOrganization(userId);
  const stripeCustomerId = await getCustomerId({
    userId,
    email: organization.email,
  });
  const stripeCards: StripeCard[] = [];
  if (stripeCustomerId) {
    let hasMore = true;
    while (hasMore) {
      const existingCardRes = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
      });
      existingCardRes.data.forEach(method => {
        if (method.card) {
          stripeCards.push({
            id: method.id,
            brand: method.card.brand,
            exp_month: method.card.exp_month,
            exp_year: method.card.exp_year,
            last4: method.card.last4,
          });
        }
      });
      hasMore = existingCardRes.has_more;
    }
  }
  return stripeCards;
}

export async function preBilling(request: { userId: string, collectionId: string }): Promise<PreBillingResponse> {
  const { userId, collectionId } = request;
  const organization = await getCreatorOrganization(userId);
  const collection = await KnexHelper.getNftCollectionByID(collectionId);
  const feePayment = await KnexHelper.getSingleFeePayment({
    collection_id: collectionId,
    organization_id: userId,
    active: PaymentActive.ACTIVE,
    purpose: PaymentPurpose.CONTRACT_DEPLOYMENT,
    status: PaymentStatus.PENDING,
    method: PaymentMethod.FIAT,
  });
  // get active feesPayment as well
  if (!collection) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'Collection not found');
  }

  if (!feePayment) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Collection creation not initiated');
  }

  if (new Date(feePayment.expires_at).getTime() < Date.now()) {
    await KnexHelper.updateNftCollectionPayment(collectionId, {
      status: NftCollectionStatus.DRAFT,
    });
    await KnexHelper.updateFeePayment(feePayment.id, {
      status: PaymentStatus.EXPIRED,
      active: null
    });
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Payment window expired');
  }
  if ([NftCollectionStatus.DEPLOYED, NftCollectionStatus.PROCESSING_PAYMENT].includes(collection.status! as NftCollectionStatus)) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Invalid collection status');
  }
  const stripeCustomerId = await getCustomerId({
    userId,
    email: organization.email,
  });
  return {
    stripeCustomerId,
    organization,
    collection,
    feePayment,
  };
}

export async function getClientSecret(request: { userId: string, collectionId: string }, saveCard = false): Promise<string> {
  const {
    stripeCustomerId,
    organization,
    collection,
    feePayment,
  } = await preBilling(request);

  const intentParams: Stripe.PaymentIntentCreateParams = {
    customer: stripeCustomerId,
    amount: parseInt((parseFloat(feePayment.estimate_fiat!) * 100).toString()),
    currency: feePayment.currency,
    payment_method_types: [
      'card',
    ],
    receipt_email: organization?.email,
    metadata: {
      collection_id: collection.id!,
      organization_id: collection.organization_id!,
      product: PRODUCT_ID,
      payment_for: PaymentPurpose.CONTRACT_DEPLOYMENT
    }
  };
  if (saveCard) {
    intentParams.setup_future_usage = 'off_session';
  }
  const paymentIntent = await stripe.paymentIntents.create(intentParams);
  return paymentIntent.client_secret!;
}

export async function chargeCard(request: { userId: string, collectionId: string, cardId: string }): Promise<{ client_secret: string, requires_auth: boolean }> {
  const { cardId } = request;
  const {
    stripeCustomerId,
    collection,
    feePayment,
  } = await preBilling(request);

  const intentParams: Stripe.PaymentIntentCreateParams = {
    customer: stripeCustomerId,
    amount: parseInt((parseFloat(feePayment.estimate_fiat!) * 100).toString()),
    currency: feePayment.currency,
    payment_method: cardId,
    off_session: true,
    confirm: true,
    metadata: {
      collection_id: collection.id!,
      organization_id: collection.organization_id!,
      product: PRODUCT_ID,
      payment_for: PaymentPurpose.CONTRACT_DEPLOYMENT
    }
  };
  try {
    const paymentIntent = await stripe.paymentIntents.create(intentParams);
    await KnexHelper.updateNftCollectionPayment(collection.id!, {
      status: NftCollectionStatus.PAYMENT_PENDING,
    });
    return { client_secret: paymentIntent.client_secret!, requires_auth: false };

  } catch (err: any) {
    // Error code will be authentication_required if authentication is needed
    console.log('Error code is: ', err.code);
    console.log('Error message is: ', err.raw?.message);
    if (err.code === 'authentication_required') {
      const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
      console.log('PI retrieved: ', paymentIntentRetrieved.id);
      return { client_secret: paymentIntentRetrieved.client_secret!, requires_auth: false };
    }
  }
  throw new CustomError(StatusCodes.BAD_REQUEST, 'Could not charge card');
}

export async function processStripeWebhookEvent(req: any): Promise<void> {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    Logger.Error('No Stripe Signature');
    throw new CustomError(StatusCodes.UNAUTHORIZED, 'No Signature');
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeConfig.endpointSecret);
  } catch (e) {
    // Logger.Error(req.body);
    Logger.Error('Stripe validation failed');
    throw new CustomError(StatusCodes.UNAUTHORIZED, '');
  }
  console.log(event);
  const eventType = event.type;
  // @ts-ignore
  const product = event.data.object.metadata?.product;
  // @ts-ignore
  const payment_for = event.data.object.metadata?.payment_for;
  // handle based on the above variables.

  if (eventType.startsWith('payment_intent') && (product === PRODUCT_ID) && (payment_for === PaymentPurpose.CONTRACT_DEPLOYMENT)) {
    const paymentIntent: Stripe.PaymentIntent = event.data.object as unknown as Stripe.PaymentIntent;
    const collection_id = paymentIntent.metadata.collection_id;
    const feePayment = await KnexHelper.getSingleFeePayment({
      collection_id,
      active: PaymentActive.ACTIVE,
      purpose: PaymentPurpose.CONTRACT_DEPLOYMENT,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.FIAT,
    });
    switch (event.type) {
      case 'payment_intent.processing': {
        const collection = await KnexHelper.getNftCollectionByID(collection_id);
        if (collection) {
          await KnexHelper.updateNftCollectionPayment(collection_id, {
            status: NftCollectionStatus.PROCESSING_PAYMENT,
          });
        }
        break;
      }
      case 'payment_intent.succeeded': {
        // Deploy collection
        const collection = await KnexHelper.getNftCollectionByID(collection_id);
        if (feePayment) {
          await KnexHelper.updateFeePayment(feePayment.id, {
            amount_paid: (paymentIntent.amount_received / 100).toString(),
            status: PaymentStatus.SUCCESSFUL,
            provider_tx_id: paymentIntent.id,
            active: null,
          });
        }
        if (collection) {
          await KnexHelper.updateNftCollectionPayment(collection_id, {
            status: NftCollectionStatus.DEPLOYMENT_IN_PROGRESS,
          });
          callContract(collection).then();
        }
        break;
      }
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        if (feePayment) {
          await KnexHelper.updateFeePayment(feePayment.id, {
            amount_paid: (paymentIntent.amount_received / 100).toString(),
            status: PaymentStatus.FAILED,
            provider_tx_id: paymentIntent.id,
            active: null,
          });
        }
        // Update status
        await KnexHelper.updateNftCollectionPayment(collection_id, {
          status: NftCollectionStatus.DEPLOYMENT_FAILED,
        });
        break;
      }
    }
  }
}
