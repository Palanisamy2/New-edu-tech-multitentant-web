import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("refresh_tokens", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable(); // References either public.users or tenant.users
    table.string("token").notNullable().unique();
    table.string("tenant_slug").notNullable();
    table.timestamp("expires_at").notNullable();
    table.timestamps(true, true);
    table.index(["token"]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("refresh_tokens");
}
