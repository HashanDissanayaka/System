import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL and Anon Key are missing! Check your environment variables.');
}

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
