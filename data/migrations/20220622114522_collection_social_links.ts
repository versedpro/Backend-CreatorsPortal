import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.string('main_link').nullable();
    table.jsonb('social_links').defaultTo([]);
    table.specificType('whitelist_host_addresses', 'varchar[]');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.dropColumn('main_link');
    table.dropColumn('social_links');
    table.dropColumn('whitelist_host_addresses');
  });
}

