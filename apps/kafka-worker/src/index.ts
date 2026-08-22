import { Kafka } from 'kafkajs';
import { config } from './config';
import { handleTenantProvision } from './consumers/tenant.consumer';
import { handleNotificationEvent } from './consumers/notification.consumer';
import { handleDomainProvision } from './consumers/domain.consumer';
import { runPaymentDeadlineCheck } from './cron-jobs/payment-deadlines';
import cron from 'node-cron';

const kafka = new Kafka({
  clientId: config.kafkaClientId,
  brokers: config.kafkaBrokers
});

const consumer = kafka.consumer({ groupId: config.kafkaGroupId });
const producer = kafka.producer(); // Producer for cron jobs

const run = async () => {
  await consumer.connect();
  await producer.connect();
  console.log('Worker connected to Kafka (Consumer & Producer)');

  // 1. Subscribe to topics
  await consumer.subscribe({ 
    topics: ['TENANT_PROVISION_REQUESTED', 'SEND_NOTIFICATION', 'DOMAIN_PROVISION_REQUESTED'], 
    fromBeginning: false 
  });

  // 2. Process messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const payload = JSON.parse(message.value?.toString() || '{}');
      console.log(`Processing ${topic} [${partition}]:`, payload);

      try {
        if (topic === 'TENANT_PROVISION_REQUESTED') {
          await handleTenantProvision(payload, producer);
        } else if (topic === 'SEND_NOTIFICATION') {
          await handleNotificationEvent(payload);
        } else if (topic === 'DOMAIN_PROVISION_REQUESTED') {
          await handleDomainProvision(payload);
        }
      } catch (err) {
        console.error(`Error processing ${topic}:`, err);
      }
    },
  });

  // 3. Start real scheduler for Cron Jobs (Every day at 8:00 AM)
  cron.schedule('0 8 * * *', () => {
    console.log('⏰ Triggering daily payment deadline check...');
    runPaymentDeadlineCheck(producer).catch(console.error);
  });

  // Graceful Shutdown
  const shutdown = async () => {
    console.log('🛑 Shutting down worker...');
    await consumer.disconnect();
    await producer.disconnect();
    console.log('📡 Kafka connections closed.');
    const { getPool } = await import('@genyuga/database');
    await getPool().destroy();
    console.log('🗄️ Database pool closed.');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

run().catch(console.error);
