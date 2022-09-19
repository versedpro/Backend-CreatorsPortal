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
  FirstPartyQuestionAnswerInsertData,
  GetCollectionsResponse
} from '../interfaces/collection';
import { TokenExistsError } from '../interfaces';
import { NftItem, UpdateMetadataRequest } from '../interfaces/nft';
import { GetItemRequest } from '../interfaces/get.item.request';
import { UpdateUserDbRequest } from '../interfaces/user';
import { OrgInvite, OrgInviteStatus } from '../interfaces/OrgInvite';
import { UserAuth } from '../interfaces/onboarding';

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
  static async insertOrganization(org: UpdateOrganizationRequest): Promise<any> {
    const newOrg = {
      name: org.name,
      type: org.type,
      email: org.email,
      onboarding_type: org.onboarding_type,
    };
    const result = await knex(dbTables.organizations).insert(newOrg, 'id');
    Logger.Info(result);
    return result;
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

  static async getNftCollection(id: string): Promise<CollectionInfo[]> {
    const result = await knex(dbTables.nftCollections).select().where({
      id,
    }).limit(1);
    return result as CollectionInfo[];
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

  static async upsertMetadata(metadata: NftItem): Promise<any> {
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
      .orderBy('updated_at', 'desc')
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
}
