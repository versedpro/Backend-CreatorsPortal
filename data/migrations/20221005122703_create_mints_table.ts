import { Knex } from 'knex';
import { dbTables } from '../constants';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.mintTransactions, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();

    table.specificType('collection_id', 'uuid')
      .notNullable().index()
      .references('id').inTable(dbTables.nftCollections)
      .onDelete('CASCADE');

    table.string('contract_address').notNullable();
    table.string('token_id').notNullable();
    table.string('to_address').notNullable();
    table.string('quantity').notNullable();
    table.string('price').notNullable();
    table.datetime('minted_at').notNullable();
    table.string('chain').notNullable();
    table.string('tx_hash').notNullable().unique();
    table.enum('method', ['CRYPTO', 'FIAT']).notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.mintTransactions);
}

