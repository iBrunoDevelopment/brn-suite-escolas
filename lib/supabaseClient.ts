
/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
};

// Fallback logic to prevent app crash if keys are missing/invalid
const finalUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = supabaseAnonKey || 'placeholder-key';

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing or invalid. Check your .env.local file.');
}

export const supabase = createClient(finalUrl, finalKey);
