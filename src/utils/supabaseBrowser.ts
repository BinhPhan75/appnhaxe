import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserSupabase: SupabaseClient | null | undefined;

function normalizeSupabaseUrl(rawUrl?: string) {
  let normalizedUrl = (rawUrl || '').trim().replace(/^["']|["']$/g, '');
  const restIndex = normalizedUrl.indexOf('/rest/v1');
  if (restIndex !== -1) {
    normalizedUrl = normalizedUrl.slice(0, restIndex);
  }
  while (normalizedUrl.endsWith('/')) {
    normalizedUrl = normalizedUrl.slice(0, -1);
  }
  return normalizedUrl;
}

export function getBrowserSupabase(): SupabaseClient | null {
  if (browserSupabase !== undefined) return browserSupabase;

  const env = import.meta.env as Record<string, string | undefined>;
  const supabaseUrl = normalizeSupabaseUrl(env.VITE_SUPABASE_URL);
  const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']|["']$/g, '');

  browserSupabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

  return browserSupabase;
}

export function getMissingBrowserSupabaseMessage() {
  return 'Không tìm thấy backend /api và chưa cấu hình VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY cho bản chạy tĩnh.';
}
