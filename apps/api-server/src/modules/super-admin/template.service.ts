import { getPool } from '@genyuga/database';

export class TemplateEngineService {
  /**
   * Pushes a global UI layout update to all active tenants.
   * This is used for "Platform-wide" UI refreshes.
   */
  static async pushGlobalLayout(layoutConfig: any) {
    const pool = getPool();
    console.log('🏗️ [TemplateEngine] Pushing global layout update to all tenants...');
    
    // Get all active tenant slugs from public schema
    const activeTenants = await pool('public.clients')
      .where('saas_sub_status', 'active')
      .select('slug');

    const slugs = activeTenants.map(t => t.slug);

    for (const slug of slugs) {
      try {
        console.log(`📦 Updating layout for ${slug}...`);
        await pool('layout_config')
          .withSchema(slug)
          .insert({
            pages_json: JSON.stringify(layoutConfig.pages),
            theme_tokens: JSON.stringify(layoutConfig.theme)
          });
      } catch (err) {
        console.error(`❌ Failed to update layout for ${slug}:`, err);
      }
    }

    return { affectedTenants: slugs.length };
  }

  /**
   * Returns the default "Starter" template for new tenants.
   */
  static getDefaultTemplate() {
    return {
      theme: {
        primaryColor: '#6366f1',
        fontFamily: 'Inter',
        borderRadius: '12px'
      },
      pages: [
        { id: 'home', blocks: ['hero', 'featured_courses', 'testimonials'] },
        { id: 'about', blocks: ['content_section', 'team_grid'] }
      ]
    };
  }
}
