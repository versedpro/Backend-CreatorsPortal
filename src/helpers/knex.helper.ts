import { dbTables } from '../constants';
import { Admin, GetAdminRequest, SaveAdminRequest, UpdateDbAdminRequest } from '../interfaces/admin';

import { db as knex } from '../../data/db';
import {
  GetInviteRequest,
  GetInvitesRequest,
  GetOrganizationAuthRequest,
  GetOrganizationInfoRequest,
  GetOrganizationsRequest,
  GetOrganizationsResponse,
  InsertInviteDbRequest,
  OrganizationInfo,
  UpdateInviteDbRequest,
  UpdateOrganizationRequest
} from '../interfaces/organization';
import { Logger } from './Logger';
import { Pagination } from '../interfaces/pagination';
import {
  CollectionInfo,
  DbGetOrganizationCollectionsRequest,
  DbUpdateCollectionData, DbUpdateCollectionPayment,
  FirstPartyQuestionAnswerInsertData, GetCollectionAssetsRequest, GetCollectionAssetsResponse,
  GetCollectionsResponse, UpdateCollectionAllAssetData, UpdateCollectionAssetData
} from '../interfaces/collection';
import { TokenExistsError } from '../interfaces';
import { DeletedNftItemData, NftItem, UpdateMetadataRequest } from '../interfaces/nft';
import { GetItemRequest } from '../interfaces/get.item.request';
import { UpdateUserDbRequest } from '../interfaces/user';
import { OrgInvite, OrgInviteStatus } from '../interfaces/OrgInvite';
import { UserAuth } from '../interfaces/onboarding';
import {
  DbGetPaymentParam,
  DbInsertPaymentRequest,
  DbUpdatePaymentRequest,
  FeePayment,
  PaymentActive
} from '../interfaces/PaymentRequest';
import { DbGetPayoutsRequest, DbInsertPayout, GetPayoutsResponse, Payout } from '../interfaces/payout';
import { DbInsertStripeAccount, GetStripeAccount, StripeAccount } from '../interfaces/stripe.account';
import { GetMintsResponse, GetMintTransactionsRequest, MintTransaction } from '../interfaces/mint.transaction';

export class KnexHelper {
  /*
  * Admins CRUD
  * */
  static async insertAdmin(admin: SaveAdminRequest): Promise<boolean> {
    await knex(dbTables.admins).insert(admin);
    return true;
  }

  static async getAdmins(request: GetAdminRequest): Promise<Admin[]> {
    const result = await knex(dbTables.admins).select().where(request);
    return result as Admin[];
  }

  static async updateAdmin(public_address: string, body: UpdateDbAdminRequest): Promise<boolean> {
    // Always have a new Nonce
    if (!body.nonce) {
      body.nonce = Math.floor(Math.random() * 1000000);
    }
    await knex(dbTables.admins)
      .where({ public_address })
      .update(body);
    return true;
  }

  /*
  * Organizations CRUD
  * */
  static async insertOrganization(org: UpdateOrganizationRequest): Promise<{ id: string }> {
    const newOrg = {
      name: org.name,
      type: org.type,
      email: org.email,
      onboarding_type: org.onboarding_type,
    };
    const result = await knex(dbTables.organizations).insert(newOrg, 'id');
    Logger.Info(result);
    return result[0];
  }

  static async getOrganizationInfo(request: GetOrganizationInfoRequest): Promise<OrganizationInfo[]> {
    const result = await knex(dbTables.organizations).select().where(request).limit(1);
    return result as OrganizationInfo[];
  }

  static async getSingleOrganizationInfo(request: GetOrganizationInfoRequest): Promise<OrganizationInfo | undefined> {
    const result = await knex(dbTables.organizations).select().where(request).limit(1);
    if (result.length === 0) {
      return undefined;
    }
    return result[0];
  }

  static generateOrganizationWhereClause(request: GetOrganizationsRequest): { rawQuery: string, values: string[] } {
    const { name, type, email } = request;

    let rawQuery = '';
    const clauses: string[] = [];
    const values: string[] = [];
    // Search params
    if (name) {
      clauses.push('name ILIKE ?');
      values.push(`%${name}%`);
    }
    if (type) {
      clauses.push('type ILIKE ?');
      values.push(`${type}%`);
    }
    if (email) {
      clauses.push('email ILIKE ?');
      values.push(`%${email}%`);
    }

    if (clauses.length > 0) {
      rawQuery += ' WHERE ' + clauses.join(' AND ');
    }

    return { rawQuery, values };
  }

  static async getOrganizations(request: GetOrganizationsRequest): Promise<GetOrganizationsResponse> {
    const { page, size } = request;

    const { rawQuery, values } = this.generateOrganizationWhereClause(request);

    const countResult = await knex(dbTables.organizations)
      .count('* as count')
      .joinRaw(rawQuery, values)
      .first();

    const result = await knex(dbTables.organizations)
      .select()
      .joinRaw(rawQuery, values)
      .offset((page - 1) * size)
      .orderBy('updated_at', 'desc')
      .limit(size);

    const allItems = result as OrganizationInfo[];
    const count = parseInt(countResult?.count.toString() || '0');
    const pagination: Pagination = {
      page,
      size: allItems.length,
      last_page: Math.ceil(count / size),
      total_count: count,
    };

    return { pagination, items: allItems };
  }

  static async updateOrganization(organization_id: string, org: UpdateOrganizationRequest): Promise<boolean> {
    const newOrg = {
      name: org.name,
      type: org.type,
      website: org.website,
      twitter: org.twitter,
      discord: org.discord,
      facebook: org.facebook,
      instagram: org.instagram,
      email: org.email,
      admin_name: org.admin_name,
      public_address: org.public_address,
      image: org.image,
      banner: org.banner,
      nonce: org.nonce,
    };

    await knex(dbTables.organizations)
      .where({ id: organization_id })
      .update(newOrg);
    return true;
  }

  /*
  * NFT Collections CRUD
  * */
  static async insertNftCollection(collection: CollectionInfo): Promise<any> {
    return knex(dbTables.nftCollections).insert(collection);
  }

  static async updateNftCollection(collection: CollectionInfo | DbUpdateCollectionData): Promise<any> {
    return knex(dbTables.nftCollections)
      .where({ id: collection.id })
      .update(collection);
  }

  static async updateNftCollectionAddress(collectionId: string, contractAddress: string): Promise<any> {
    return knex(dbTables.nftCollections)
      .where({ id: collectionId })
      .update({ status: 'DEPLOYED', contract_address: contractAddress });
  }

  static async updateNftCollectionPayment(collectionId: string, body: DbUpdateCollectionPayment): Promise<any> {
    return knex(dbTables.nftCollections)
      .where({ id: collectionId })
      .update(body);
  }

  static async getAllNftCollections(): Promise<CollectionInfo[]> {
    const result = await knex(dbTables.nftCollections).select();
    return result as CollectionInfo[];
  }

  static async getNftCollectionByID(id: string): Promise<CollectionInfo | undefined> {
    const result = await knex(dbTables.nftCollections).select().where({
      id,
    }).limit(1);
    if (result.length === 0) {
      return;
    }
    return result[0];
  }

  static async getNftCollectionByParams(params: any): Promise<CollectionInfo[]> {
    const result = await knex(dbTables.nftCollections).select().where(params).limit(1);
    return result as CollectionInfo[];
  }

  static async deleteNftCollection(id: string): Promise<number> {
    const tokenResult = await knex(dbTables.nftItems).count().where({ collection_id: id });
    // Check if collection has tokens, do not delete.
    // @ts-ignore
    if (tokenResult.count > 0) {
      throw new TokenExistsError();
    }
    return knex(dbTables.nftCollections).where({ id }).del();
  }

  static async insertMetadata(metadata: NftItem): Promise<any> {
    return knex(dbTables.nftItems).insert(metadata);
  }

  static async attachMetadataTokenId(collectionId: string): Promise<any> {
    return knex.raw(`DO $$
          DECLARE
          identifier UUID;
          counter INTEGER := 1;
          BEGIN
          FOR identifier IN SELECT id FROM public.nft_items WHERE collection_id = '${collectionId}'
          \tLOOP
          \tUPDATE nft_items\tSET token_id=counter WHERE id=identifier;
          \tcounter := counter + 1;
          \tEND LOOP;
          END$$;`
    );
  }

  static async upsertMetadata(metadata: NftItem): Promise<any> {
    return knex(dbTables.nftItems).insert(metadata)
      .onConflict(['collection_id', 'token_id'])
      .merge()
      .onConflict(['id'])
      .merge();
  }

  static async bulkUpsertMetadata(metadata: NftItem[]): Promise<any> {
    return knex(dbTables.nftItems).insert(metadata)
      .onConflict(['collection_id', 'token_id'])
      .merge()
      .onConflict(['id'])
      .merge();
  }

  static async updateMetadata(body: UpdateMetadataRequest): Promise<any> {
    const result = await knex(dbTables.nftItems)
      .where({ collection_id: body.collection_id })
      .update(body.metadata);
    Logger.Info(result);
    return result;
  }

  static async getNftsByCollection(collection_id: string): Promise<NftItem[]> {
    const result = await knex(dbTables.nftItems).select().where({ collection_id });
    return result as NftItem[];
  }

  static async getSingleMetadata(body: GetItemRequest): Promise<NftItem[]> {
    Logger.Info(body);
    const result = await knex(dbTables.nftItems).select().where({
      collection_id: body.collectionId,
      token_id: body.tokenId
    }).limit(1);

    result.forEach((item: any) => {
      delete item.id;
      delete item.created_at;
      delete item.updated_at;
      delete item.collection_id;

      Object.keys(item).forEach(x => {
        if (item[x] === null) {
          delete item[x];
        }
      });
    });
    return result as NftItem[];
  }

  static async getCollections(request: DbGetOrganizationCollectionsRequest): Promise<GetCollectionsResponse> {
    const { page, size, rawQuery, values } = request;

    const countResult = await knex(dbTables.nftCollections)
      .count('* as count')
      .joinRaw(rawQuery, values)
      .first();

    const result = await knex(dbTables.nftCollections)
      .select()
      .joinRaw(rawQuery, values)
      .offset((page - 1) * size)
      .orderBy('updated_at', (request.date_sort || 'desc').toLowerCase())
      .limit(size);

    const allItems = result as CollectionInfo[];
    const count = parseInt(countResult?.count.toString() || '0');
    const pagination: Pagination = {
      page,
      size: allItems.length,
      last_page: Math.ceil(count / size),
      total_count: count,
    };

    return { pagination, items: allItems };
  }

  static async insertMintAnswers(data: FirstPartyQuestionAnswerInsertData[]): Promise<any> {
    return knex(dbTables.firstPartyQuestionAnswers)
      .insert(data)
      .returning('*');
  }

  static async updateUser(public_address: string, body: UpdateUserDbRequest): Promise<boolean> {
    // Always have a new Nonce
    if (!body.nonce) {
      body.nonce = Math.floor(Math.random() * 1000000);
    }
    await knex(dbTables.users)
      .where({ public_address })
      .update(body);
    return true;
  }

  /*
 * Organizations CRUD
 * */
  static async insertOrganizationInvite(invite: InsertInviteDbRequest): Promise<any> {
    return knex(dbTables.organizationInvites).insert(invite, 'id');
  }

  static async getOrganizationInvite(request: GetInviteRequest): Promise<OrgInvite[]> {
    const result = await knex(dbTables.organizationInvites).select().where(request).limit(1);
    return result as OrgInvite[];
  }

  static async getInvites(request: GetInvitesRequest): Promise<{ items: OrgInvite[], pagination: Pagination }> {
    const clauses = [];
    const values = [];
    if (request.keyword) {
      clauses.push('name ILIKE ? OR email ILIKE ?');
      values.push(`%${request.keyword}%`);
      values.push(`%${request.keyword}%`);
    }
    if (request.status) {
      clauses.push('status = ?');
      values.push(`${request.status}`);
    }
    const result = await knex(dbTables.organizationInvites).select().whereRaw(clauses.join('AND'), values)
      .offset((request.page - 1) * request.size)
      .orderBy('expires_at', request.date_sort || 'DESC')
      .limit(request.size);

    const countResult = await knex(dbTables.organizationInvites)
      .count('* as count')
      .whereRaw(clauses.join('AND'), values)
      .first();

    const count = parseInt(countResult?.count.toString() || '0');

    const pagination: Pagination = {
      page: request.page,
      size: result.length,
      last_page: Math.ceil(count / request.size),
      total_count: count,
    };
    return { items: result as OrgInvite[], pagination };
  }

  static async deleteInvite(id: string): Promise<number> {
    return knex(dbTables.organizationInvites).where({ id }).del();
  }

  static async updateOrganizationInvite(invite: UpdateInviteDbRequest): Promise<any> {
    return knex(dbTables.organizationInvites)
      .where({ id: invite.id })
      .update({
        invite_code: invite.invite_code,
        expires_at: invite.expires_at,
      });
  }

  // RUNS EVERY 15 MINUTES
  static async updateExpiredInvites(): Promise<number> {
    Logger.Info('Updating Invites expiry');
    const updated = await knex(dbTables.organizationInvites)
      .whereRaw('expires_at < now () AND status != \'EXPIRED\'')
      .update({
        status: OrgInviteStatus.EXPIRED,
      });
    Logger.Info(`Updated ${updated} Invites expiry`);
    return updated;
  }

  // RUNS EVERY 5 MINUTES
  static async deleteExpiredTokens(): Promise<number> {
    Logger.Info('Deleting Expired User Tokens');
    const deleted = await knex(dbTables.userTokens)
      .whereRaw('expires_at < now ()')
      .delete();
    Logger.Info(`Deleted ${deleted} user tokens`);
    return deleted;
  }

  static async getOrganizationAuth(request: GetOrganizationAuthRequest): Promise<UserAuth | undefined> {
    const res = await knex(dbTables.organizationAuths).select()
      .where(request).limit(1);
    if (res.length === 0) {
      return undefined;
    }
    return res[0] as unknown as UserAuth;
  }

  static async saveStripeCustomerId(body: { organizationId: string, customerId: string }): Promise<boolean> {
    return knex(dbTables.stripeCustomers)
      .insert({
        organization_id: body.organizationId,
        customer_id: body.customerId,
      });
  }

  static async getStripeCustomerId(organizationId: string): Promise<string | undefined> {
    const res = await knex(dbTables.stripeCustomers).select()
      .where({ organization_id: organizationId }).limit(1);
    if (res.length === 0) {
      return undefined;
    }
    return res[0].customer_id;
  }

  static async insertFeePayment(body: DbInsertPaymentRequest): Promise<boolean> {
    const { collection_id, purpose } = body;
    await knex(dbTables.feesPayments)
      .update({
        active: null,
      })
      .where({
        collection_id,
        purpose,
        active: PaymentActive.ACTIVE,
      });
    return knex(dbTables.feesPayments)
      .insert(body);
  }

  static async updateFeePayment(id: string, body: DbUpdatePaymentRequest): Promise<number> {
    return knex(dbTables.feesPayments)
      .update(body)
      .where({
        id,
      });
  }

  static async getSingleFeePayment(body: DbGetPaymentParam): Promise<FeePayment | undefined> {
    const result = await knex(dbTables.feesPayments)
      .select()
      .where(body)
      .orderBy('updated_at', 'desc')
      .limit(1);
    if (result.length > 0) {
      return result[0];
    }
  }

  // RUNS EVERY 5 MINUTES
  static async expireFeePayment(): Promise<number> {
    Logger.Info('Expiring Late Fee Payments');
    const updated = await knex(dbTables.feesPayments)
      .whereRaw('expires_at < now () AND status = ?', ['PENDING'])
      .update({ status: 'EXPIRED' });
    Logger.Info(`Expired ${updated} fee payments`);
    return updated;
  }

  static async getPayouts(request: DbGetPayoutsRequest): Promise<GetPayoutsResponse> {
    const { page, size, rawQuery, values } = request;

    const countResult = await knex(dbTables.payouts)
      .count('* as count')
      .joinRaw(rawQuery, values)
      .first();

    const result = await knex(dbTables.payouts)
      .select()
      .joinRaw(rawQuery, values)
      .offset((page - 1) * size)
      .orderBy('updated_at', (request.date_sort || 'desc').toLowerCase())
      .limit(size);

    const allItems = result as Payout[];
    const count = parseInt(countResult?.count.toString() || '0');
    const pagination: Pagination = {
      page,
      size: allItems.length,
      last_page: Math.ceil(count / size),
      total_count: count,
    };

    return { pagination, items: allItems };
  }

  static async insertPayout(body: DbInsertPayout): Promise<Payout> {
    const res = await knex(dbTables.payouts)
      .insert(body)
      .returning('*');
    return res[0];
  }

  static async insertStripeAccount(body: DbInsertStripeAccount): Promise<StripeAccount> {
    const res = await knex(dbTables.stripeConnectedAccounts)
      .insert(body)
      .returning('*');
    return res[0];
  }

  static async getStripeAccount(body: GetStripeAccount): Promise<StripeAccount | undefined> {
    const result = await knex(dbTables.stripeConnectedAccounts)
      .select()
      .where(body)
      .limit(1);
    if (result.length > 0) {
      return result[0];
    }
  }

  static async getMints(request: GetMintTransactionsRequest): Promise<GetMintsResponse> {
    const { page, size, collection_id, date_sort, token_id } = request;
    const whereCheck: { collection_id: string, token_id?: string } = { collection_id };
    if (token_id) {
      whereCheck.token_id = token_id;
    }
    const countResult = await knex(dbTables.mintTransactions)
      .count('* as count')
      .where(whereCheck)
      .first();

    const result = await knex(dbTables.mintTransactions)
      .select()
      .where(whereCheck)
      .offset((page - 1) * size)
      .orderBy('minted_at', (date_sort || 'desc').toLowerCase())
      .limit(size);

    const allItems = result as MintTransaction[];
    const count = parseInt(countResult?.count.toString() || '0');
    const pagination: Pagination = {
      page,
      size: allItems.length,
      last_page: Math.ceil(count / size),
      total_count: count,
    };

    return { pagination, items: allItems };
  }

  static async getNftsByIds(ids: string[]): Promise<NftItem[]> {
    const result = await knex(dbTables.nftItems).select().whereIn('id', ids);
    return result as NftItem[];
  }

  static async deleteNftsByIds(ids: string[]): Promise<DeletedNftItemData[]> {
    const result = await knex(dbTables.nftItems).delete().whereIn('id', ids).returning(['id', 'image']);
    return result as unknown as DeletedNftItemData[];
  }

  static async getCollectionAssets(request: GetCollectionAssetsRequest): Promise<GetCollectionAssetsResponse> {
    const { page, size, collection_id, date_sort, assets_ids } = request;
    const whereCheck: { collection_id: string } = { collection_id };

    // const countResult = await knex(dbTables.mintTransactions)
    //   .count('* as count')
    //   .where(whereCheck)
    //   .first();

    const countQuery = knex(dbTables.nftItems)
      .count('* as count')
      .where(whereCheck);

    let countResult;
    if (assets_ids && (assets_ids.length > 0)) {
      countResult = await countQuery.whereIn('id', assets_ids).first();
    } else {
      countResult = await countQuery.first();
    }

    const resultQuery = knex(dbTables.nftItems)
      .select()
      .where(whereCheck);
    if (assets_ids && (assets_ids.length > 0)) {
      resultQuery.whereIn('id', assets_ids);
    }
    const result = await resultQuery.offset((page - 1) * size)
      .orderBy('created_at', (date_sort || 'desc').toLowerCase())
      .limit(size);

    const allItems = result as NftItem[];
    const count = parseInt(countResult?.count.toString() || '0');
    const pagination: Pagination = {
      page,
      size: allItems.length,
      last_page: Math.ceil(count / size),
      total_count: count,
    };

    return { pagination, items: allItems };
  }

  static async updateNftItem(id: string, body: UpdateCollectionAssetData): Promise<number> {
    // @ts-ignore
    delete body.id;
    if (body.quantity) {
      body.max_supply = body.quantity;
      delete body.quantity;
    }
    if (body.attributes) {
      body.attributes = JSON.stringify(body.attributes);
    }
    if (Object.values(body).map(x => x !== undefined).length > 0) {
      return knex(dbTables.nftItems)
        .update(body)
        .where({
          id,
        });
    }
    return 0;
  }

  static async updateCollectionAllNftItems(collectionId: string, body: UpdateCollectionAllAssetData): Promise<number> {
    if (body.name) {
      await knex.raw(`DO $$
          DECLARE
          identifier UUID;
          counter INTEGER := 1;
          BEGIN
          FOR identifier IN SELECT id FROM public.nft_items WHERE collection_id = '${collectionId}' ORDER BY created_at ASC
          \tLOOP
          \tUPDATE nft_items\tSET name='${body.name} ' || counter WHERE id=identifier;
          \tcounter := counter + 1;
          \tEND LOOP;
          END$$;`
      );
      delete body.name;
    }
    if (body.quantity) {
      body.max_supply = body.quantity;
      delete body.quantity;
    }
    if (body.attributes) {
      body.attributes = JSON.stringify(body.attributes);
    }
    if (Object.values(body).map(x => x !== undefined).length > 0) {
      return knex(dbTables.nftItems)
        .update(body)
        .where({
          collection_id: collectionId,
        });
    }
    return 1;
  }

}
