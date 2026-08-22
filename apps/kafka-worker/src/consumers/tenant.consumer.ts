import { getPool } from '@genyuga/database';
import path from 'path';
import bcrypt from 'bcryptjs';

export const handleTenantProvision = async (payload: { slug: string, orgName: string, adminEmail: string }, producer: any) => {
  const { slug, orgName, adminEmail } = payload;
  
  // Validate slug for safety (alphanumeric, underscores, hyphens only)
  if (!/^[a-z0-9_-]+$/.test(slug)) {
    console.error(`❌ Invalid slug detected: ${slug}`);
    throw new Error(`Invalid tenant slug: ${slug}`);
  }

  const pool = getPool();

  console.log(`Starting background provisioning for ${slug}...`);

  try {
    // 1. Create Schema using parameterized query to prevent SQL injection
    await pool.raw('CREATE SCHEMA IF NOT EXISTS ??', [slug]);

    // 2. Run Migrations
    // Note: The migrations path might need to be resolved differently in the worker
    const tenantMigrationsDir = path.resolve(__dirname, '../../../../packages/database/migrations/tenant');
    
    await pool.migrate.latest({
      directory: tenantMigrationsDir,
      schemaName: slug
    });

    // 3. Create Default Admin User
    const passwordHash = await bcrypt.hash('Welcome@123', 10);
    await pool('users').withSchema(slug).insert({
      name: `${orgName} Admin`,
      email: adminEmail,
      password_hash: passwordHash,
      role: 'admin'
    });

    // 4. Mark as Active in public
    await pool('public.clients').where({ slug }).update({
      saas_sub_status: 'active'
    });

    console.log(`Provisioning complete for ${slug}.`);

    // 5. Notify Admin via Email
    await producer.send({
      topic: 'SEND_NOTIFICATION',
      messages: [{
        value: JSON.stringify({
          type: 'WELCOME_ADMIN',
          tenantSlug: slug,
          data: {
            orgName,
            adminEmail,
            tempPassword: 'Welcome@123',
            loginUrl: `https://${slug}.genyuga.io/login`
          }
        })
      }]
    });
    console.log(`✅ Welcome email event queued for ${adminEmail}`);
  } catch (err) {
    console.error(`Provisioning failed for ${slug}:`, err);
    // Mark as Failed in public
    await pool('public.clients').where({ slug }).update({
      saas_sub_status: 'failed'
    });
    throw err; // For Kafka retry
  }
};
