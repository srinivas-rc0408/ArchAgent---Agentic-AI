import { createClient } from '@supabase/supabase-js';

const hardcodedUrl = "https://pefzoadcadwvluqzlash.supabase.co";
const hardcodedKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlZnpvYWRjYWR3dmx1cXpsYXNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NjU0MDgsImV4cCI6MjA5MzM0MTQwOH0.EMLVBGfIIieXyu1QHBMorADa8oq-vLX1NswaJYUTLr8";

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValid = (val: any) => typeof val === 'string' && val.startsWith('http') && val.length > 20;

const supabaseUrl = isValid(envUrl) ? envUrl : hardcodedUrl;
const supabaseAnonKey = (typeof envKey === 'string' && envKey.length > 50) ? envKey : hardcodedKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
