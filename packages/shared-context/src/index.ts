import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantSlug: string;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext | undefined {
  return tenantLocalStorage.getStore();
}

export function getTenantSlug(): string {
  const context = getTenantContext();
  if (!context) {
    // Default to public if no context (e.g. background jobs, super-admin)
    return 'public';
  }
  return context.tenantSlug;
}

export function runWithTenant(tenantSlug: string, fn: () => void) {
  return tenantLocalStorage.run({ tenantSlug }, fn);
}
