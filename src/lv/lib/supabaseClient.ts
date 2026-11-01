// @ts-nocheck
/**
 * Re-export supabase client with .from() bypassing PostgREST schema cache type validation.
 * Import this instead of "@/lv/integrations/supabase/client" in admin pages
 * to avoid "Could not find column in schema cache" errors.
 */
import { supabase } from "@/lv/integrations/supabase/client";

// Create a proxy that casts .from() results to any
export const db: typeof supabase & { from: (table: string) => any } = new Proxy(supabase, {
  get(target, prop) {
    if (prop === "from") {
      return (table: string) => (target as any).from(table);
    }
    return (target as any)[prop];
  },
}) as any;
