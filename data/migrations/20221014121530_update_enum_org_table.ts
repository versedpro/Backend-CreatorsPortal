import { Knex } from "knex";
import { dbTables } from "../constants";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    ALTER TABLE "${dbTables.organizations}"
    DROP CONSTRAINT "organizations_onboarding_type_check"
  `);

  await knex.schema.raw(`
    ALTER TABLE "${dbTables.organizations}"
    ADD CONSTRAINT "organizations_onboarding_type_check" 
    CHECK (onboarding_type in ('INVITED', 'ADMIN_CREATED', 'SELF_INVITE'))
  `);
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.raw(`
    ALTER TABLE "${dbTables.organizations}"
    DROP CONSTRAINT "organizations_onboarding_type_check"
  `);

  await knex.schema.raw(`
    ALTER TABLE "${dbTables.organizations}"
    ADD CONSTRAINT "organizations_onboarding_type_check" 
    CHECK (onboarding_type in ('INVITED', 'ADMIN_CREATED'))
  `);
}

