import type { Knex } from "knex";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "postgresql",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "Palani47@",
      database: process.env.DB_NAME || "genyuga"
    },
    migrations: {
      directory: "./migrations/public",
      extension: "ts"
    }
  }
};

export default config;
