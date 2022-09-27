import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTableIfNotExists(dbTables.feesPayments, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();
    table.specificType('organization_id', 'uuid')
      .index()
      .references('id').inTable(dbTables.organizations)
      .onDelete('SET NULL');
    table.specificType('collection_id', 'uuid')
      .index()
      .references('id').inTable(dbTables.nftCollections)
      .onDelete('SET NULL');
    table.string('estimate_crypto');
    table.string('estimate_fiat');
    table.string('amount_paid');
    table.string('amount_expected').notNullable();
    table.string('currency').notNullable();
    table.string('network').notNullable();
    table.enum('status', ['SUCCESSFUL', 'FAILED', 'PENDING', 'EXPIRED'])
      .notNullable().defaultTo('PENDING');
    table.enum('method', ['CRYPTO', 'FIAT']);
    table.string('tx_hash', 100);
    table.string('sender', 100);
    table.string('provider', 100);
    table.string('provider_tx_id', 500);
    table.string('purpose').notNullable(); // DEPLOYMENT, PAYOUT, and more future actions.
    table.datetime('expires_at').notNullable();
    table.timestamps(true, true);
    table.string('active');

    table.unique(['collection_id', 'purpose', 'status', 'active']);
    return table;
  });

}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.feesPayments);
}

