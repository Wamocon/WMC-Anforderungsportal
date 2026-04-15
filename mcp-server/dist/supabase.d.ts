import { createClient as createSupabaseClient } from '@supabase/supabase-js';
type AnySupabaseClient = ReturnType<typeof createSupabaseClient<any, any, any>>;
/**
 * Get a Supabase client configured from environment variables.
 * Supports both service-role (staff) and anon key (PO via their own token).
 */
export declare function getSupabaseClient(): AnySupabaseClient;
/**
 * Create an authenticated client for a specific user (PO mode).
 * Uses the user's access token to scope all queries to their RLS policies.
 */
export declare function getSupabaseClientForUser(accessToken: string): AnySupabaseClient;
export {};
