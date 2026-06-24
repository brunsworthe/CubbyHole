import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Shared singleton for client components that previously imported the
// legacy localStorage-backed client from '@/lib/supabase' — this one
// stores the session in cookies so middleware can read it too. Left untyped
// (no <Database> generic) since the Database type only covers `capsules`
// and these call sites also query `captures`/`profiles`, matching the
// untyped behavior of the client they're replacing.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
