import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log("URL", url);
const supabase = createClient(url, key);
supabase.from('some_table').select('*').limit(1).then(res => {
  console.log("RES:", res.error?.message || "SUCCESS");
}).catch(err => console.log("ERR:", err.message));
