import { getPool } from '@genyuga/database';
import { kafkaProducer } from '../../core/kafka/producer.service';

export class TenantService {
  /**
   * Initiates tenant provisioning via background worker.
   */
  static async provisionTenant(slug: string, orgName: string, adminEmail: string) {
    const pool = getPool();

    // 1. Transactional creation in public (synchronous for immediate client registration)
    await pool.transaction(async (trx) => {
       await trx('public.clients').insert({
         slug,
         org_name: orgName,
         admin_email: adminEmail,
         saas_sub_status: 'provisioning'
       });
    });

    // 2. Offload schema/migration/user creation to Kafka
    await kafkaProducer.sendEvent('TENANT_PROVISION_REQUESTED', {
        slug,
        orgName,
        adminEmail
    });

    return { 
      slug, 
      status: 'provisioning_started',
      message: 'Background worker has been notified to set up the isolated workspace.'
    };
  }
}
