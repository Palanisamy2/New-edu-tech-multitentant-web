import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Ensure we are in public schema
  await knex.raw('SET search_path TO public');

  await knex.schema.createTable("subscription_plans", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name").notNullable();
    table.decimal("monthly_price", 10, 2).notNullable();
    table.jsonb("features_json").defaultTo("{}");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("clients", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("slug").unique().notNullable();
    table.string("org_name").notNullable();
    table.string("admin_email").notNullable();
    table.uuid("plan_id").references("id").inTable("subscription_plans");
    table.string("saas_customer_id");
    table.string("saas_sub_status").defaultTo("active");
    table.integer("student_limit").defaultTo(100);
    table.string("custom_domain");
    table.string("domain_status").defaultTo("pending");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("audit_log", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").notNullable();
    table.string("tenant_slug");
    table.string("action").notNullable();
    table.jsonb("details").defaultTo("{}");
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('SET search_path TO public');
  await knex.schema.dropTableIfExists("audit_log");
  await knex.schema.dropTableIfExists("clients");
  await knex.schema.dropTableIfExists("subscription_plans");
}
