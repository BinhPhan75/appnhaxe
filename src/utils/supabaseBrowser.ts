import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserSupabase: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (browserSupabase !== undefined) return browserSupabase;

  const env = import.meta.env as Record<string, string | undefined>;
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

  browserSupabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

  return browserSupabase;
}

export function getMissingBrowserSupabaseMessage() {
  return 'Không tìm thấy backend /api và chưa cấu hình VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY cho bản chạy tĩnh.';
}
