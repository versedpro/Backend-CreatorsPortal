import { OrganizationInfo } from '../interfaces/organization';
import { Logger } from '../helpers/Logger';
import { KnexHelper } from '../helpers/knex.helper';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { PreBillingResponse, StripeCard } from '../interfaces/stripe.card';
import Stripe from 'stripe';
import { stripeConfig } from '../constants';
import { NftCollectionStatus } from '../interfaces/collection';
import { callContract } from './collection.service';

// Create stripe payment client
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2022-08-01',
});

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
  if (!collection) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'Collection not found');
  }

  if (!collection.fees_estimate_usd) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Collection creation not initiated');
  }

  if (!collection.payment_expires_at || (new Date(collection.payment_expires_at).getTime() < Date.now())) {
    await KnexHelper.updateNftCollectionPayment(collectionId, {
      status: NftCollectionStatus.DRAFT,
      fees_estimate_crypto: null,
      fees_estimate_usd: null,
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
  };
}

export async function getClientSecret(request: { userId: string, collectionId: string }, saveCard = false): Promise<string> {
  const {
    stripeCustomerId,
    organization,
    collection,
  } = await preBilling(request);

  const intentParams: Stripe.PaymentIntentCreateParams = {
    customer: stripeCustomerId,
    amount: parseInt((parseFloat(collection.fees_estimate_usd!) * 100).toString()),
    currency: 'usd',
    payment_method_types: [
      'card',
    ],
    receipt_email: organization?.email,
    metadata: {
      collection_id: collection.id!,
      organization_id: collection.organization_id!,
      product: 'creators_portal'
    }
  };
  if (saveCard) {
    intentParams.setup_future_usage = 'off_session';
  }
  const paymentIntent = await stripe.paymentIntents.create(intentParams);
  // await KnexHelper.updateNftCollectionPayment(collection.id!, {
  //   status: NftCollectionStatus.PAYMENT_PENDING,
  // });
  return paymentIntent.client_secret!;
}

export async function chargeCard(request: { userId: string, collectionId: string, cardId: string }): Promise<{ client_secret: string, requires_auth: boolean }> {
  const { cardId } = request;
  const {
    stripeCustomerId,
    collection,
  } = await preBilling(request);

  const intentParams: Stripe.PaymentIntentCreateParams = {
    customer: stripeCustomerId,
    amount: parseInt((parseFloat(collection.fees_estimate_usd!) * 100).toString()),
    currency: 'usd',
    payment_method: cardId,
    off_session: true,
    confirm: true,
    metadata: {
      collection_id: collection.id!,
      organization_id: collection.organization_id!,
      product: 'creators_portal'
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
    const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
    console.log('PI retrieved: ', paymentIntentRetrieved.id);
    if (err.code === 'authentication_required') {
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

  if (event.type.startsWith('payment_intent')) {
    const paymentIntent: Stripe.PaymentIntent = event.data.object as unknown as Stripe.PaymentIntent;
    if (!(paymentIntent.metadata?.product === 'creators_portal')) {
      return;
    }
    const collection_id = paymentIntent.metadata.collection_id;
    // const organization_id = paymentIntent.metadata.organization_id;
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
        // Update status
        await KnexHelper.updateNftCollectionPayment(collection_id, {
          status: NftCollectionStatus.DEPLOYMENT_FAILED,
        });
        break;
      }
    }
  }

}
