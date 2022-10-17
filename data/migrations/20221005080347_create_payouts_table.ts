import { Knex } from 'knex';
import { dbTables } from '../constants';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.payouts, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();

    table.specificType('collection_id', 'uuid')
      .notNullable().index()
      .references('id').inTable(dbTables.nftCollections)
      .onDelete('CASCADE');

    table.string('tx_hash');
    table.string('chain').notNullable();
    table.enum('method', ['CRYPTO', 'FIAT']).notNullable();
    table.string('recipient').notNullable();
    table.string('amount').notNullable();
    table.string('currency').notNullable();
    table.string('amount_in_fiat');
    table.string('amount_in_crypto').notNullable();
    table.string('bank_name');
    table.enum('initiated_by', ['ADMIN', 'USER']).notNullable();
    table.string('initiator_id').notNullable();
    table.dateTime('paid_at').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.payouts);
}

