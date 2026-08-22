import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // Common user table for all roles (admin, trainer, student)
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("role").notNullable(); // admin, trainer, student
    table.string("name").notNullable();
    table.string("email").unique().notNullable();
    table.string("phone");
    table.string("password_hash");
    table.string("google_id");
    table.string("whatsapp_id");
    table.string("avatar_url");
    table.text("bio");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("tenant_audit_log", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("user_id").references("id").inTable("users");
    table.string("action_type").notNullable();
    table.uuid("entity_id");
    table.text("details");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("courses", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("title").notNullable();
    table.decimal("price", 10, 2).defaultTo(0);
    table.string("status").defaultTo("draft");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("course_modules", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("course_id").references("id").inTable("courses").onDelete("CASCADE");
    table.string("title").notNullable();
    table.integer("drip_days").defaultTo(0);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("lessons", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("module_id").references("id").inTable("course_modules").onDelete("CASCADE");
    table.string("title").notNullable();
    table.string("type").notNullable(); // live_zoom, live_meet, pdf, text
    table.string("content_url");
    table.jsonb("meeting_data");
    table.timestamp("scheduled_at");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("enrollments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("student_id").references("id").inTable("users");
    table.uuid("course_id").references("id").inTable("courses");
    table.decimal("total_fee", 10, 2).notNullable();
    table.decimal("paid_amount", 10, 2).defaultTo(0);
    table.string("fee_status").defaultTo("unpaid"); // unpaid, partial, paid
    table.timestamp("next_due_date");
    table.string("access_status").defaultTo("active");
    table.timestamp("completed_at");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("payments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.uuid("enrollment_id").references("id").inTable("enrollments");
    table.uuid("student_id").references("id").inTable("users");
    table.string("receipt_number").unique();
    table.decimal("amount", 10, 2).notNullable();
    table.string("payment_mode").notNullable(); // online, cash
    table.string("gateway"); // razorpay, stripe, none
    table.string("status").defaultTo("pending");
    table.uuid("collected_by").references("id").inTable("users"); // Admin ID
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("payments");
  await knex.schema.dropTableIfExists("enrollments");
  await knex.schema.dropTableIfExists("lessons");
  await knex.schema.dropTableIfExists("course_modules");
  await knex.schema.dropTableIfExists("courses");
  await knex.schema.dropTableIfExists("tenant_audit_log");
  await knex.schema.dropTableIfExists("users");
}
