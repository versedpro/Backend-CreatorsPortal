import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.string('royalty_address', 42);
    table.string('payout_address', 42);
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.dropColumn('royalty_address');
    table.dropColumn('payout_address');
  });
}

