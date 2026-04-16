import { createClient as createSupabaseClient } from '@supabase/supabase-js';
type AnySupabaseClient = ReturnType<typeof createSupabaseClient<any, any, any>>;
interface Session {
    accessToken: string;
    refreshToken: string;
    email: string;
    userId: string;
    role: string;
    fullName: string | null;
    expiresAt: number;
}
export declare function getSession(): Session | null;
export declare function setSession(s: Session | null): void;
/**
 * Returns true when a service-role key is configured (admin/god mode available).
 */
export declare function hasServiceKey(): boolean;
/**
 * Get the service-role client (admin / bypass RLS).
 */
export declare function getServiceClient(): AnySupabaseClient;
/**
 * Smart client selector:
 * - If a user is logged in → return session-scoped client (RLS enforced)
 * - If service-role key exists → return admin client (RLS bypassed)
 * - Otherwise → throw (login required)
 */
export declare function getSupabaseClient(): AnySupabaseClient;
/**
 * Auth helper: sign in with email + password using the Supabase Auth API,
 * then look up the user's role in project_members.
 */
export declare function signIn(email: string, password: string): Promise<Session>;
export declare function signOut(): void;
/**
 * @deprecated Use getSupabaseClient() instead — kept for backwards compat.
 */
export declare function getSupabaseClientForUser(accessToken: string): AnySupabaseClient;
export {};
