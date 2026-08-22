import { getPool } from '@genyuga/database';
import { kafkaProducer } from '../apps/api-server/src/core/kafka/producer.service';
import bcrypt from 'bcryptjs';

async function seed() {
    const pool = getPool();
    console.log('🌱 Triggering tenant provisioning...');

    try {
        // Ensure Kafka is connected
        await kafkaProducer.connect();
        
        // Notify the worker to provision 'quantum'
        await kafkaProducer.sendEvent('TENANT_PROVISION_REQUESTED', {
            slug: 'quantum',
            orgName: 'Quantum Academy',
            adminEmail: 'quantum-admin@example.com'
        });
        
        console.log('✅ Kafka event sent for tenant "quantum"');
        console.log('⏳ Waiting 5 seconds for background worker to finish...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('✨ All set! You can now log in.');

    } catch (err) {
        console.error('❌ Provisioning trigger failed:', err);
    } finally {
        await pool.destroy();
        await kafkaProducer.disconnect();
    }
}

seed();
