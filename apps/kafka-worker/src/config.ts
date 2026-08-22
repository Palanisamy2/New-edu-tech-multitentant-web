import dotenv from 'dotenv';
import path from 'path';

// Load .env from the root of the project or current app
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  kafkaBrokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  kafkaClientId: 'genyuga-worker',
  kafkaGroupId: 'genyuga-worker-group'
};
