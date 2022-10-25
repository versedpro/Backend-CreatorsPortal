import { KnexHelper } from '../helpers/knex.helper';
import {
  CreatePayoutsRequest,
  DbInsertPayout,
  GetCollectionPayoutsRequest,
  GetPayoutsResponse,
  Payout,
  PayoutInitiator,
  PayoutMethod
} from '../interfaces/payout';
import { db as knex } from '../../data/db';
import { chainCurrency, dbTables, FRONTEND_URL, stripeConfig } from '../constants';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { UserAuth } from '../interfaces/onboarding';
import bcrypt from 'bcrypt';
import { ContractServiceRegistry } from '../helpers/contract.service.registry';
import { NftCollectionStatus } from '../interfaces/collection';
import { Logger } from '../helpers/Logger';
import Stripe from 'stripe';
import { AccountLink } from '../interfaces/stripe.account';
import { ConvertCurrencyResponse, GetPriceRequest } from '../interfaces/coinbase';
import { CoinbaseClient } from '../helpers/coinbase.client';
import * as CacheHelper from '../helpers/cache.helper';
import { ethers } from 'ethers';

const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2022-08-01',
});

export function generatePayoutsWhereClause(request: GetCollectionPayoutsRequest): { rawQuery: string, values: any[] } {
  const { collection_id, recipient_address, recipient_account_id } = request;

  let rawQuery = '';
  const clauses: string[] = [];
  const values: any[] = [];
  // Search params
  clauses.push('collection_id = ?');
  values.push(collection_id);

  if (recipient_address) {
    clauses.push('recipient ILIKE ?');
    values.push(`%${recipient_address}%`);
  }

  if (recipient_account_id) {
    clauses.push('recipient = ?');
    values.push(recipient_account_id);
  }

  rawQuery += ' WHERE ' + clauses.join(' AND ');

  return { rawQuery, values };
}

export async function getCollectionPayouts(body: GetCollectionPayoutsRequest): Promise<GetPayoutsResponse> {
  const { rawQuery, values } = generatePayoutsWhereClause(body);
  return await KnexHelper.getPayouts({
    rawQuery,
    values,
    page: body.page,
    size: body.size,
    date_sort: body.date_sort,
  });
}

export async function processPayout(body: CreatePayoutsRequest): Promise<Payout> {
  const {
    recipient_address,
    recipient_account_id,
    initiator_id,
    initiated_by,
    method,
    organization_id,
    collection_id
  } = body;
  // verify password if user sent it
  if (initiated_by === PayoutInitiator.USER) {
    const authRes = await knex(dbTables.organizationAuths).select()
      .where({
        organization_id,
      }).limit(1);
    if (authRes.length === 0) {
      throw new CustomError(StatusCodes.NOT_FOUND, 'Organization does not exist');
    }
    const emailAuth = authRes[0] as unknown as UserAuth;
    if (!bcrypt.compareSync(body.password || '', emailAuth.password)) {
      throw new CustomError(StatusCodes.BAD_REQUEST, 'Password Incorrect');
    }
  }

  const results = await KnexHelper.getNftCollectionByParams({
    id: collection_id,
    organization_id,
  });
  if (results.length === 0) {
    throw new CustomError(StatusCodes.NOT_FOUND, 'Collection does not exist');
  }
  const collection = results[0];
  if ((collection.status !== NftCollectionStatus.DEPLOYED) || !collection.contract_address) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Collection is not deployed yet');
  }

  const contractService = ContractServiceRegistry.getService(collection.chain);
  Logger.Info(`Fetching contract balance for ${collection.contract_address}`);
  const balance = await contractService.getAddressBalance(collection.contract_address);
  Logger.Info(`Fetching contract balance for ${collection.contract_address}, value: ${balance.toString()}`);
  if (balance.lte(0)) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Contract balance is low.');
  }

  if (method === PayoutMethod.CRYPTO && recipient_address) {
    // send to address
    const res = await contractService.withdrawToAddress({
      contractAddress: collection.contract_address,
      recipientAddress: recipient_address,
    });
    if (!res) {
      throw new CustomError(StatusCodes.INTERNAL_SERVER_ERROR, 'Could not withdraw');
    }
    // create payout record
    const amount = ethers.utils.formatEther(balance.toString()).toString();
    const payoutInsert: DbInsertPayout = {
      collection_id,
      tx_hash: res.transactionHash,
      chain: collection.chain,
      method: PayoutMethod.CRYPTO,
      recipient: recipient_address,
      amount,
      currency: chainCurrency[collection.chain],
      amount_in_crypto: amount,
      initiated_by,
      initiator_id,
      paid_at: new Date(),
    };
    return KnexHelper.insertPayout(payoutInsert);
  } else if ((method === PayoutMethod.FIAT) && recipient_account_id) {
    // Get conversion, have an admin&user endpoint [another endpoint]
    // send to coinbase wallet
    // run transfer from Stripe to account
    throw new CustomError(StatusCodes.BAD_REQUEST, `Not Implemented. accountId:= ${recipient_account_id}`);
  }
  throw new CustomError(StatusCodes.BAD_REQUEST, 'Not Implemented');
}

export async function createStripeAccount(organizationId: string): Promise<AccountLink> {
  const existingOrg = await KnexHelper.getSingleOrganizationInfo({ id: organizationId });
  if (!existingOrg) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Organization does already exists');
  }
  return createConnectedAccount({
    id: existingOrg.id,
    email: existingOrg.email,
  });
}

export async function createConnectedAccount(organization: { email: string, id: string }): Promise<AccountLink> {
  const { email, id } = organization;
  // check if org already has one
  const existingAccount = await KnexHelper.getStripeAccount({
    organization_id: id,
  });

  if (existingAccount) {
    const stripeAccount = await stripe.accounts.retrieve(existingAccount.account_id);
    if (!stripeAccount.details_submitted) {
      // details not submitted
      const accountLink = await stripe.accountLinks.create({
        account: existingAccount.account_id,
        refresh_url: `${FRONTEND_URL}/settings/bank-accounts`,
        return_url: `${FRONTEND_URL}/settings/bank-accounts`,
        type: 'account_onboarding',
      });
      Logger.Info('accountLink for update: ', accountLink);
      return {
        created_at: accountLink.created * 1000,
        expires_at: accountLink.expires_at * 1000,
        url: accountLink.url,
      };
    }
  } else {
    // if not: create account link or account.details_submitted
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      metadata: {
        organization_id: id,
      }
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${FRONTEND_URL}/settings/bank-accounts`,
      return_url: `${FRONTEND_URL}/settings/bank-accounts`,
      type: 'account_onboarding',
    });
    await KnexHelper.insertStripeAccount({
      account_id: account.id,
      organization_id: id,
    });

    Logger.Info('accountLink for onboarding: ', accountLink);
    return {
      created_at: accountLink.created * 1000,
      expires_at: accountLink.expires_at * 1000,
      url: accountLink.url,
    };
  }
  throw new CustomError(StatusCodes.BAD_REQUEST, 'Account already exists');
}

export async function getStripeBankAccounts(organizationId: string): Promise<Stripe.BankAccount[]> {
  // check if org already has one
  const existingAccount = await KnexHelper.getStripeAccount({
    organization_id: organizationId,
  });
  if (existingAccount) {
    const accounts = await stripe.accounts.listExternalAccounts(existingAccount.account_id, {
      object: 'bank_account',
      limit: 3
    });
    Logger.Info('Bank Accounts', accounts);
    return accounts.data as Stripe.BankAccount[];
  }
  return [];
}

export async function getPrice(body: GetPriceRequest): Promise<ConvertCurrencyResponse> {
  const cacheKey = `asset_price_${body.from}_${body.to}`;
  const cachedRes = await CacheHelper.get(cacheKey);
  if (cachedRes) {
    return cachedRes;
  }
  const coinbaseClient = new CoinbaseClient();
  const priceRes = await coinbaseClient.getPrice(body);
  // await coinbaseClient.getBalances();

  // const priceRes = await coinbaseClient.createMarketOrder({
  //   amount: '0.005',
  //   side: CoinbaseOrderSide.BUY,
  //   pair: 'BTC-USD',
  // });
  await CacheHelper.set(cacheKey, priceRes, 30);
  return priceRes as unknown as ConvertCurrencyResponse;
}

// createConnectedAccount({
//   id: 'c313b642-a07f-4409-8ec7-35be8da1b084',
//   email: 'hashilekky@gmail.com'
// });
