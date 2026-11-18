import { createClient, SupabaseClient } from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'';
export const supabase:SupabaseClient|null=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export function requireSupabase(){if(!supabase)throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');return supabase;}
