import { Knex } from "knex";
import { dbTables } from "../constants";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizationInvites, table => {
    table.enum('invite_type', ['ADMIN_INVITED', 'SELF_INVITE']).defaultTo('ADMIN_INVITED');
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizationInvites, table => {
    table.dropColumn('invite_type');
  });
}

