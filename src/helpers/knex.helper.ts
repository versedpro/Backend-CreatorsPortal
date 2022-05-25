import { dbTables } from '../constants';
import { Admin, GetAdminRequest, SaveAdminRequest, UpdateDbAdminRequest } from '../interfaces/admin';

import { db as knex } from '../../data/db';
import {
  GetOrganizationInfoRequest,
  GetOrganizationsRequest, GetOrganizationsResponse,
  OrganizationInfo,
  UpdateOrganizationRequest
} from '../interfaces/organization';
import { Logger } from './Logger';
import { Pagination } from '../interfaces/pagination';

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
      values.push(`${name}%`);
    }
    if (type) {
      clauses.push('type ILIKE ?');
      values.push(`${type}%`);
    }
    if (admin_email) {
      clauses.push('admin_email ILIKE ?');
      values.push(`${admin_email}%`);
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
}
