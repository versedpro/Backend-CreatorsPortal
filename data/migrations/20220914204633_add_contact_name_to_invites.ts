import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizationInvites, table => {
    table.string('contact_name', 55);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.organizationInvites, table => {
    table.dropColumn('contact_name');
  });
}
