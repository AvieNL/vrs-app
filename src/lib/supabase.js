import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('Supabase omgevingsvariabelen ontbreken. Voeg VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY toe aan .env.local');
}

export const supabase = createClient(url || '', key || '');
