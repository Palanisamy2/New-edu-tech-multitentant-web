import { z } from 'zod';

export const provisionTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Academy name is too short'),
    slug: z.string().regex(/^[a-z0-9_-]+$/, 'Slug must be lowercase, alphanumeric, with hyphens/underscores only'),
    adminEmail: z.string().email('Invalid admin email'),
    planId: z.string().optional(),
  }),
});
