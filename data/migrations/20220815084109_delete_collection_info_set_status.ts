import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.dropColumn('max_supply_set');
    table.dropColumn('mint_price_set');
    table.dropColumn('royalty_address_set');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(dbTables.nftCollections, table => {
    table.boolean('max_supply_set').defaultTo(false);
    table.boolean('mint_price_set').defaultTo(false);
    table.boolean('royalty_address_set').defaultTo(false);
  });
}
