import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.string('payment_option').nullable();
    table.string('payment_client_id').nullable();
    table.string('fees_estimate_crypto', 30);
    table.string('fees_estimate_usd', 30);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.dropColumn('payment_option');
    table.dropColumn('fees_estimate_crypto');
    table.dropColumn('fees_estimate_usd');
  });
}

