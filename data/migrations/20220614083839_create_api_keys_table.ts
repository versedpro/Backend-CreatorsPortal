import { Knex } from 'knex';
import { dbTables } from '../constants';

const uniqueIndexName = 'only_one_active_keys';
export async function up(knex: Knex): Promise<void> {

  await knex.schema.createTable(dbTables.apiSecretKeys, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();

    table.specificType('organization_id', 'uuid')
      .notNullable().index()
      .references('id').inTable(dbTables.organizations)
      .onDelete('CASCADE');

    table.string('api_key').notNullable();
    table.string('secret_key').notNullable();
    table.enum('status', ['DEACTIVATED', 'ACTIVE']).notNullable();
    table.timestamps(true, true);
  });

  await knex.raw(`CREATE UNIQUE INDEX IF NOT EXISTS ${uniqueIndexName} ON ${dbTables.apiSecretKeys} (organization_id) WHERE status='ACTIVE';`);
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.apiSecretKeys);
}

