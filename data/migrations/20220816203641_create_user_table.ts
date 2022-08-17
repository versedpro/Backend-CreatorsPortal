import { Knex } from 'knex';
import { dbTables } from '../constants';


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(dbTables.users, table => {
    table.specificType('id', 'uuid')
      .defaultTo(knex.raw('uuid_generate_v4 ()'))
      .primary();
    table.string('public_address').notNullable().unique();
    table.integer('nonce').unsigned().defaultTo(Math.floor(Math.random() * 1000000));
    table.string('username').nullable();
    table.string('image').nullable();
    table.string('name').nullable();
    table.string('website');
    table.string('twitter');
    table.string('discord');
    table.string('facebook');
    table.string('instagram');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists(dbTables.users);
}

