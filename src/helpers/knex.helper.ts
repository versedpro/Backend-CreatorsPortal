import { dbTables } from '../constants';
import { Admin, GetAdminRequest, SaveAdminRequest, UpdateDbAdminRequest } from '../interfaces/admin';

import { db as knex } from '../../data/db';
import {
  GetOrganizationInfoRequest,
  GetOrganizationsRequest,
  GetOrganizationsResponse,
  OrganizationInfo,
  UpdateOrganizationRequest
} from '../interfaces/organization';
import { Logger } from './Logger';
import { Pagination } from '../interfaces/pagination';
import {
  CollectionInfo,
  DbGetOrganizationCollectionsRequest,
  DbUpdateCollectionData, FirstPartyQuestionAnswerInsertData,
  GetCollectionsResponse
} from '../interfaces/collection';
import { TokenExistsError } from '../interfaces';
import { NftItem, UpdateMetadataRequest } from '../interfaces/nft';
import { GetItemRequest } from '../interfaces/get.item.request';
import {
  InsertOrganizationKeyData,
  OrganizationKey,
  UpdateOrganizationKeyStatusData
} from '../interfaces/OrganizationKey';

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
      website: org.website,
      twitter: org.twitter,
      discord: org.discord,
      admin_email: org.admin_email,
      admin_name: org.admin_name,
      admin_wallet_address: org.admin_wallet_address,
    };
    const result = await knex(dbTables.organizations).insert(newOrg, 'id');
    Logger.Info(result);
    return result;
  }

  static async getOrganizationInfo(request: GetOrganizationInfoRequest): Promise<OrganizationInfo[]> {
    const result = await knex(dbTables.organizations).select().where(request).limit(1);
    return result as OrganizationInfo[];
  }

  static generateOrganizationWhereClause(request: GetOrganizationsRequest): { rawQuery: string, values: string[] } {
    const { name, type, admin_email } = request;

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
    if (admin_email) {
      clauses.push('admin_email ILIKE ?');
      values.push(`%${admin_email}%`);
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
      admin_email: org.admin_email,
      admin_name: org.admin_name,
      admin_wallet_address: org.admin_wallet_address,
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

  static async updateNftCollectionToDeployed(collectionId: string, contractAddress: string): Promise<any> {
    return knex(dbTables.nftCollections)
      .where({ id: collectionId })
      .update({ status: 'DEPLOYED', contract_address: contractAddress });
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

  static async insertOrganizationKey(data: InsertOrganizationKeyData): Promise<OrganizationKey> {
    return knex(dbTables.apiSecretKeys).insert(data);
  }

  static async updateOrganizationKeyStatus(body: UpdateOrganizationKeyStatusData): Promise<any> {
    return knex(dbTables.apiSecretKeys)
      .where({ organization_id: body.organizationId })
      .update({ status: body.status });
  }

  static async getActiveOrganizationKey(organizationId: string): Promise<OrganizationKey | undefined> {
    const result = await knex(dbTables.apiSecretKeys).select().where({
      organization_id: organizationId,
      status: 'ACTIVE',
    }).limit(1);
    if (result.length > 0) {
      return result[0] as OrganizationKey;
    }
    return undefined;
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

}
