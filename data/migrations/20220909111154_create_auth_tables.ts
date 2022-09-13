import { Knex } from 'knex';
import { dbTables } from '../constants';

function addIds(knex: Knex, table: any) {
  table.specificType('id', 'uuid')
    .defaultTo(knex.raw('uuid_generate_v4 ()'))
    .primary();
  table.specificType('organization_id', 'uuid')
    .notNullable().index()
    .references('id').inTable(dbTables.organizations)
    .onDelete('SET NULL');
  return table;
}

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.organizationAuths, table => {
    table = addIds(knex, table);
    table.string('email').notNullable().unique();
    table.string('password').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable(dbTables.passwordResets, table => {
    table = addIds(knex, table);
    table.string('email').notNullable().unique();
    table.string('otp').notNullable();
    table.dateTime('expires_at').notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable(dbTables.userTokens, table => {
    table = addIds(knex, table);
    table.string('token').notNullable();
    table.boolean('valid').notNullable();
    table.string('client_id').notNullable();
    table.dateTime('expires_at').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.organizationAuths);
  await knex.schema.dropTableIfExists(dbTables.passwordResets);
  await knex.schema.dropTableIfExists(dbTables.userTokens);
}

