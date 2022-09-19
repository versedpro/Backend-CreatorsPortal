import { Knex } from 'knex';
import { dbTables } from '../constants';


function addSimilarColumns(knex: Knex, table: any) {
  table.specificType('id', 'uuid')
    .defaultTo(knex.raw('uuid_generate_v4 ()'))
    .primary();
  table.specificType('organization_id', 'uuid')
    .notNullable().index()
    .references('id').inTable(dbTables.organizations)
    .onDelete('SET NULL');
  table.specificType('collection_id', 'uuid')
    .notNullable().index()
    .references('id').inTable(dbTables.nftCollections)
    .onDelete('SET NULL');
  table.string('amount').notNullable();
  table.string('expected_amount').notNullable();
  table.string('currency').notNullable();
  table.string('network').notNullable();
  table.enum('status', ['SUCCESSFUL', 'FAILED']).notNullable();
  table.timestamps(true, true);
  return table;
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.deployCryptoPayments, table => {
    table = addSimilarColumns(knex, table);
    table.string('tx_hash', 60);
    table.string('sender', 60);
    return table;
  });

  await knex.schema.createTable(dbTables.deployCashPayments, table => {
    table = addSimilarColumns(knex, table);
    table.string('provider', 60);
    table.string('provider_tx_id', 200);
    return table;
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.deployCryptoPayments);
  await knex.schema.dropTableIfExists(dbTables.deployCashPayments);
}

