import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.organizationInvites, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();
    table.string('name').nullable();
    table.string('email').notNullable().unique();
    table.boolean('email_sent').defaultTo(false);
    table.string('invite_code').notNullable().unique();
    table.enum('status', ['NOT_SIGNED_UP', 'SIGNED_UP', 'EXPIRED']).defaultTo('NOT_SIGNED_UP');
    table.dateTime('expires_at').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.organizationInvites);
}

