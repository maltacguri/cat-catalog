import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    '.env 에 VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 가 필요합니다. .env.example 참고.'
  );
}

export const supabase = createClient(url, key);
if (import.meta.env.DEV) window.sb = supabase