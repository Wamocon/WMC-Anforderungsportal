#!/usr/bin/env node
/**
 * WMC Anforderungsportal MCP Server
 *
 * Provides 20+ tools for Product Owners and Staff to manage projects,
 * templates, requirements, and responses via any MCP-compatible client
 * (VS Code Copilot, Claude Desktop, Cursor, etc.)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getSupabaseClient, getSession, signIn, signOut, hasServiceKey } from './supabase.js';
const server = new McpServer({
    name: 'anforderungsportal',
    version: '1.7.0',
});
// ═══════════════════════════════════════════════════════════════
// AUTH TOOLS — Login as a specific role to scope all operations
// ═══════════════════════════════════════════════════════════════
const ROLE_COMMANDS = {
    super_admin: `
  ── You are SUPER ADMIN — full access ──

  ★ COMPLETE PROJECT WORKFLOW (5 steps):
    1. create_project <name>               → Create draft (any PO or you)
    2. submit_for_review <project_id>      → PO submits draft for review
    3. approve_project <project_id>        → YOU: approve the project
    4. activate_project <project_id>       → YOU: make it live for clients
    5. invite_member <project_id> <email>  → Send magic link to client

  PROJECT MANAGEMENT
    list_projects                          → See all projects
    get_project <id>                       → Project details + current status
    update_project <id> …                  → Edit project
    reject_project <id> <reason>           → Send back to draft
    archive_project <id>                   → Archive
    search_projects <query>                → Search by name

  FORM FILLING (after project is active)
    get_form_questions <project_id>        → See all questions with IDs
    create_response <project_id>           → Start a new response
    fill_form <response_id> <answers_json> → Fill all answers at once (JSON)
    submit_answer <resp_id> <q_id> <value> → Fill one answer
    submit_response <response_id>          → Mark as submitted
    upload_file <project_id> <q_id> <path> → Upload a file

  RESPONSES & MEMBERS
    list_responses <project_id>            → All responses
    get_response_answers <response_id>     → Answers detail
    list_project_members <project_id>      → Members + invites
    send_feedback <project_id> <resp_id> <msg>
    project_stats <project_id>             → Stats overview

  TEMPLATES
    list_templates / get_template / create_template
    add_section / add_question`,
    staff: `
  ── You are STAFF — manage projects & templates ──

  ★ YOUR ROLE IN THE WORKFLOW:
    POs create projects and submit them. YOU approve and activate.
    Step 3: approve_project <project_id>   → approve a pending_review project
    Step 4: activate_project <project_id>  → make approved project live
    Step 5: invite_member <project_id> <email> → invite clients (ONLY after active)

  ⚠ IMPORTANT: activate_project ONLY works on 'approved' projects.
    If status is 'pending_review' → approve first, then activate.
    If status is 'draft' → PO must submit_for_review first.
    Check status with: get_project <id>

  PROJECT MANAGEMENT
    list_projects                          → All org projects (any status)
    get_project <id>                       → Project details + current status
    reject_project <id> <reason>           → Send back to draft with reason
    archive_project <id>                   → Archive a project
    search_projects <query>                → Search by name

  FORM FILLING (after project is active)
    get_form_questions <project_id>        → See all questions with IDs
    create_response <project_id>           → Start a new response
    fill_form <response_id> <answers_json> → Fill all answers at once (JSON)
    submit_answer <resp_id> <q_id> <value> → Fill one answer
    submit_response <response_id>          → Mark as submitted
    upload_file <project_id> <q_id> <path> → Upload a file

  RESPONSES & MEMBERS
    list_responses <project_id>            → All responses
    get_response_answers <response_id>     → Answers detail
    list_project_members <project_id>      → Members
    send_feedback <project_id> <resp_id> <msg>
    project_stats <project_id>             → Stats overview

  TEMPLATES
    list_templates / get_template / create_template / add_section / add_question`,
    product_owner: `
  ── You are PRODUCT OWNER — your projects ──

  ★ YOUR STEPS IN THE WORKFLOW:
    Step 1: create_project <name>          → Create a new draft project
    Step 2: submit_for_review <project_id> → Submit to staff for review
    (Staff approves + activates — you cannot approve/activate yourself)
    Step 5: invite_member <project_id> <email> → Invite clients (ONLY after staff activates)

  ⚠ IMPORTANT RULES:
    - You CANNOT approve or activate your own project (staff does this)
    - invite_member only works after the project is 'active'
    - submit_for_review only works on 'draft' projects you created
    - Check project status with: get_project <id>

  PROJECT MANAGEMENT
    list_projects                          → Your projects
    get_project <id>                       → Project details + current status
    create_project <name>                  → Propose new project
    update_project <id> …                  → Edit your draft project
    submit_for_review <id>                 → Submit draft to staff for review

  INVITATIONS (only works on active projects)
    invite_member <project_id> <email>     → Send magic link to client
    list_project_members <project_id>      → See members and invites

  FORM FILLING (after project is active)
    get_form_questions <project_id>        → See all questions with IDs
    create_response <project_id>           → Start a new response
    fill_form <response_id> <answers_json> → Fill all answers at once (JSON)
    submit_answer <resp_id> <q_id> <value> → Fill one answer
    submit_response <response_id>          → Mark as submitted
    upload_file <project_id> <q_id> <path> → Upload a file

  RESPONSES
    list_responses <project_id>            → See responses
    get_response_answers <response_id>     → Read answers
    project_stats <project_id>             → Progress overview

  TEMPLATES
    list_templates / get_template          → Browse templates and questions`,
    client: `
  ── You are CLIENT — fill in your project form ──

  list_projects                            → Your assigned projects
  get_project <id>                         → Project details
  get_form_questions <project_id>          → Get form questions
  create_response <project_id>             → Start filling form
  fill_form <response_id> <answers_json>   → Bulk fill answers
  submit_answer <resp> <q_id> <value>      → Answer a question
  submit_response <response_id>            → Submit your form
  upload_file <project_id> <q_id> <path>   → Upload file
  list_responses <project_id>              → Your responses
  get_response_answers <response_id>       → Your answers`,
    authenticated: `
  ── Logged in (role unknown) ──

  list_projects                            → Your projects
  get_form_questions <project_id>          → Get form questions
  create_response <project_id>             → Start filling form
  fill_form <response_id> <answers_json>   → Bulk fill answers
  submit_answer <resp> <q_id> <value>      → Answer one question
  submit_response <response_id>            → Submit your form
  upload_file <project_id> <q_id> <path>   → Upload file
  list_responses <project_id>              → Responses
  get_response_answers <response_id>       → Answers`,
};
function getRoleCommands(role) {
    const key = Object.keys(ROLE_COMMANDS).find(k => role.includes(k)) ?? 'authenticated';
    return ROLE_COMMANDS[key];
}
server.tool('help', 'Show all available commands for your current role. Run this after login to see what you can do.', {}, async () => {
    const session = getSession();
    if (!session) {
        const adminNote = hasServiceKey()
            ? '\n  🔓 Running in admin mode — all commands available.\n  Type: login <email> <password> to switch to a specific user role.'
            : '';
        return {
            content: [{
                    type: 'text',
                    text: `  ── Anforderungsportal MCP v1.7.0 ──\n\n  Not logged in. Start with:\n\n  login your-email@example.com yourPassword\n\n  Then type  help  again to see your role-specific commands.${adminNote}\n\n  AUTH COMMANDS\n    login <email> <password>   → Sign in\n    whoami                     → Check your session\n    logout                     → Sign out`,
                }],
        };
    }
    return {
        content: [{
                type: 'text',
                text: `  Logged in as: ${session.email}  (${session.role})\n${getRoleCommands(session.role)}\n\n  ── Always available ──\n    whoami   → Check session\n    logout   → Sign out\n    help     → Show this list`,
            }],
    };
});
server.tool('login', 'Sign in with your portal credentials. After login, type "help" to see all commands available for your role.', {
    email: z.string().email().describe('User email address'),
    password: z.string().describe('User password'),
}, async ({ email, password }) => {
    try {
        const session = await signIn(email, password);
        const commands = getRoleCommands(session.role);
        return {
            content: [{
                    type: 'text',
                    text: `✅ Logged in as ${session.email}\n` +
                        `   Role: ${session.role}\n` +
                        `   Session expires: ${new Date(session.expiresAt * 1000).toISOString()}\n` +
                        `\n${commands}\n\n  Type  help  anytime to see this list again.`,
                }],
        };
    }
    catch (e) {
        return { content: [{ type: 'text', text: `❌ ${e.message}` }] };
    }
});
server.tool('whoami', 'Check current authentication status — shows logged-in user, role, and session expiry', {}, async () => {
    const session = getSession();
    if (!session) {
        const mode = hasServiceKey()
            ? '🔓 Not logged in — running in admin mode (service-role, RLS bypassed).\nUse the `login` tool to sign in as a specific user.'
            : '🔒 Not logged in — login required before using any tools.\nUse: login(email, password) with your portal credentials.';
        return { content: [{ type: 'text', text: mode }] };
    }
    const isExpired = Date.now() / 1000 > session.expiresAt;
    return {
        content: [{
                type: 'text',
                text: `👤 Logged in as: ${session.email}\n` +
                    `   Role: ${session.role}\n` +
                    `   User ID: ${session.userId}\n` +
                    `   Expires: ${new Date(session.expiresAt * 1000).toISOString()}` +
                    (isExpired ? ' ⚠️ EXPIRED — please login again' : ' ✓ active'),
            }],
    };
});
server.tool('logout', 'Sign out and return to admin mode (service-role). All subsequent tool calls will bypass RLS.', {}, async () => {
    const was = getSession();
    signOut();
    const fallback = hasServiceKey() ? 'Now running in admin mode.' : 'You need to login again to use tools.';
    return {
        content: [{
                type: 'text',
                text: was
                    ? `Logged out from ${was.email}. ${fallback}`
                    : 'No active session.',
            }],
    };
});
// ═══════════════════════════════════════════════════════════════
// PROJECT TOOLS
// ═══════════════════════════════════════════════════════════════
server.tool('list_projects', 'List all projects with optional status filter', { status: z.enum(['all', 'draft', 'pending_review', 'active', 'approved', 'archived']).optional().describe('Filter by project status') }, async ({ status }) => {
    const sb = getSupabaseClient();
    let q = sb.from('projects').select('id, name, slug, status, description, requirement_type, created_at, deadline_days');
    if (status && status !== 'all')
        q = q.eq('status', status);
    q = q.order('created_at', { ascending: false }).limit(50);
    const { data, error } = await q;
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
server.tool('get_project', 'Get detailed project information by ID or slug', { identifier: z.string().describe('Project ID (UUID) or slug') }, async ({ identifier }) => {
    const sb = getSupabaseClient();
    const isUuid = /^[0-9a-f]{8}-/.test(identifier);
    const col = isUuid ? 'id' : 'slug';
    const { data, error } = await sb.from('projects').select('*').eq(col, identifier).single();
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
server.tool('create_project', 'Create a new project (draft status). POs use this to propose a project.', {
    name: z.string().describe('Project name'),
    description: z.string().optional().describe('Project description'),
    requirement_type: z.array(z.string()).optional().default(['web_application']).describe('e.g. ["web_application","mobile_application"]'),
    template_id: z.string().optional().describe('Template ID. Omit to use default.'),
    org_id: z.string().optional().describe('Organization ID. Omit to use the default org.'),
}, async ({ name, description, requirement_type, template_id, org_id }) => {
    const sb = getSupabaseClient();
    // Get default template if not specified
    let tid = template_id;
    if (!tid) {
        const { data: def } = await sb.from('requirement_templates').select('id').eq('is_default', true).single();
        tid = def?.id ?? undefined;
    }
    // Get default org if not specified
    let oid = org_id;
    if (!oid) {
        const { data: org } = await sb.from('organizations').select('id').limit(1).single();
        oid = org?.id ?? undefined;
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    // Set created_by from logged-in session so submit_for_review and RLS policies work
    const session = getSession();
    const createdBy = session?.userId ?? null;
    const { data, error } = await sb.from('projects').insert({
        name, description: description ?? null, slug,
        status: 'draft', requirement_type: requirement_type ?? ['web_application'],
        template_id: tid ?? null, deadline_days: 5,
        org_id: oid ?? null,
        created_by: createdBy,
    }).select('id, slug').single();
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    // Immediately add the PO as a project member so they can see their own project/attachments
    if (data?.id && createdBy) {
        await sb.from('project_members').insert({
            project_id: data.id,
            user_id: createdBy,
            role: 'product_owner',
        });
    }
    return { content: [{ type: 'text', text: `Project created: ${JSON.stringify(data)}\n\nNext step: Run submit_for_review ${data?.id} to send it to staff for review.` }] };
});
server.tool('update_project', 'Update project name, description, or template', {
    project_id: z.string().describe('Project UUID'),
    name: z.string().optional(),
    description: z.string().optional(),
    template_id: z.string().optional(),
}, async ({ project_id, name, description, template_id }) => {
    const sb = getSupabaseClient();
    const updates = {};
    if (name !== undefined)
        updates.name = name;
    if (description !== undefined)
        updates.description = description;
    if (template_id !== undefined)
        updates.template_id = template_id;
    const { error } = await sb.from('projects').update(updates).eq('id', project_id);
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Project updated successfully.' }] };
});
server.tool('submit_for_review', 'Submit YOUR draft project for staff review. PREREQUISITE: project must be in draft status and you must be the creator. After this, a staff member (Waleri) must approve then activate it before clients can be invited.', { project_id: z.string().describe('Project UUID') }, async ({ project_id }) => {
    const sb = getSupabaseClient();
    // Pre-check status for a clearer error message
    const { data: proj } = await sb.from('projects').select('status, name').eq('id', project_id).single();
    if (proj && proj.status !== 'draft') {
        return { content: [{ type: 'text', text: `Cannot submit: project "${proj.name}" is currently '${proj.status}'. submit_for_review only works on 'draft' projects.\n\nStatus flow: draft → submit_for_review → pending_review → approve_project (staff) → activate_project (staff) → invite_member` }] };
    }
    const { error } = await sb.rpc('submit_for_review', { p_project_id: project_id });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}\n\nMake sure you are logged in as the project creator.` }] };
    return { content: [{ type: 'text', text: `Project submitted for review. ✓\n\nNext step: A staff member (e.g. Waleri) must now log in and run:\n  approve_project ${project_id}\n  activate_project ${project_id}\n\nThen you can run invite_member to send magic links to clients.` }] };
});
server.tool('approve_project', 'Approve a pending_review project (STAFF/ADMIN only). Project must be in pending_review status. After approving, run activate_project to make it live for clients.', { project_id: z.string().describe('Project UUID') }, async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { data: proj } = await sb.from('projects').select('status, name').eq('id', project_id).single();
    if (proj && proj.status !== 'pending_review') {
        return { content: [{ type: 'text', text: `Cannot approve: project "${proj.name}" is currently '${proj.status}'.\n\nStatus flow:\n  draft → submit_for_review (PO) → pending_review → approve_project (staff) → approved → activate_project (staff) → active → invite_member` }] };
    }
    const { error } = await sb.rpc('approve_project', { p_project_id: project_id });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}\n\nOnly staff or super_admin can approve projects.` }] };
    return { content: [{ type: 'text', text: `Project approved. ✓\n\nNext step: Run activate_project ${project_id} to make it live for clients.` }] };
});
server.tool('reject_project', 'Reject a pending_review project and send it back to draft (STAFF/ADMIN only). Include a reason so the PO knows what to fix.', {
    project_id: z.string().describe('Project UUID'),
    reason: z.string().describe('Reason for rejection — visible to the Product Owner'),
}, async ({ project_id, reason }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.rpc('reject_project', { p_project_id: project_id, p_reason: reason });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Project rejected and returned to draft.' }] };
});
server.tool('activate_project', 'Activate an approved project for client form-filling (STAFF/ADMIN only). Project MUST be in approved status — run approve_project first if needed.', { project_id: z.string().describe('Project UUID') }, async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { data: proj } = await sb.from('projects').select('status, name').eq('id', project_id).single();
    if (proj && proj.status !== 'approved') {
        const hint = proj.status === 'pending_review'
            ? `Run approve_project ${project_id} first, then activate_project.`
            : proj.status === 'draft'
                ? `PO must run submit_for_review ${project_id} first, then staff approves, then activates.`
                : `Project is '${proj.status}' — no activation needed.`;
        return { content: [{ type: 'text', text: `Cannot activate: project "${proj.name}" is currently '${proj.status}'.\n${hint}\n\nFull flow: draft → submit_for_review (PO) → pending_review → approve_project (staff) → approved → activate_project (staff) → active` }] };
    }
    const { error } = await sb.rpc('activate_project', { p_project_id: project_id });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}\n\nOnly staff or super_admin can activate projects.` }] };
    return { content: [{ type: 'text', text: `Project activated — clients can now fill the form. ✓\n\nNext step: Run invite_member ${project_id} <email> to send magic links to clients.` }] };
});
server.tool('archive_project', 'Archive a project', { project_id: z.string().describe('Project UUID') }, async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.from('projects').update({ status: 'archived' }).eq('id', project_id);
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Project archived.' }] };
});
// ═══════════════════════════════════════════════════════════════
// TEMPLATE TOOLS
// ═══════════════════════════════════════════════════════════════
server.tool('list_templates', 'List all requirement templates', {}, async () => {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('requirement_templates').select('id, name, description, is_default, created_at').order('is_default', { ascending: false });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
server.tool('get_template', 'Get a template with all its sections and questions', { template_id: z.string().describe('Template UUID') }, async ({ template_id }) => {
    const sb = getSupabaseClient();
    const [tmpl, secs, qs] = await Promise.all([
        sb.from('requirement_templates').select('*').eq('id', template_id).single(),
        sb.from('template_sections').select('*').eq('template_id', template_id).order('order_index'),
        sb.from('template_questions').select('*').order('order_index'),
    ]);
    if (tmpl.error)
        return { content: [{ type: 'text', text: `Error: ${tmpl.error.message}` }] };
    const secIds = new Set((secs.data ?? []).map(s => s.id));
    const questions = (qs.data ?? []).filter(q => secIds.has(q.section_id));
    const result = {
        ...tmpl.data,
        sections: (secs.data ?? []).map(s => ({
            ...s,
            questions: questions.filter(q => q.section_id === s.id),
        })),
    };
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
});
server.tool('create_template', 'Create a new requirement template', {
    name: z.string().describe('Template name'),
    description: z.string().optional().describe('Template description'),
}, async ({ name, description }) => {
    const sb = getSupabaseClient();
    // Get default org
    const { data: org } = await sb.from('organizations').select('id').limit(1).single();
    const { data, error } = await sb.from('requirement_templates').insert({
        name, description: description ?? null, is_default: false,
        org_id: org?.id ?? null,
    }).select('id').single();
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Template created: ${data.id}` }] };
});
server.tool('add_section', 'Add a section to a template', {
    template_id: z.string().describe('Template UUID'),
    title: z.string().describe('Section title'),
    description: z.string().optional(),
    is_required: z.boolean().optional().default(true),
}, async ({ template_id, title, description, is_required }) => {
    const sb = getSupabaseClient();
    const { data: existing } = await sb.from('template_sections').select('order_index').eq('template_id', template_id).order('order_index', { ascending: false }).limit(1);
    const nextIdx = (existing?.[0]?.order_index ?? -1) + 1;
    const { data, error } = await sb.from('template_sections').insert({
        template_id, title: { en: title }, description: description ? { en: description } : null,
        order_index: nextIdx, is_required: is_required ?? true,
    }).select('id').single();
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Section created: ${data.id}` }] };
});
server.tool('add_question', 'Add a question to a template section', {
    section_id: z.string().describe('Section UUID'),
    label: z.string().describe('Question text'),
    type: z.enum(['text', 'textarea', 'number', 'email', 'url', 'date', 'radio', 'select', 'multi_select', 'checkbox']).describe('Question type'),
    options: z.array(z.string()).optional().describe('Options for radio/select/multi_select/checkbox'),
    is_required: z.boolean().optional().default(true),
    help_text: z.string().optional(),
    placeholder: z.string().optional(),
}, async ({ section_id, label, type, options, is_required, help_text, placeholder }) => {
    const sb = getSupabaseClient();
    const { data: existing } = await sb.from('template_questions').select('order_index').eq('section_id', section_id).order('order_index', { ascending: false }).limit(1);
    const nextIdx = (existing?.[0]?.order_index ?? -1) + 1;
    const optionsJson = options ? options.map(o => ({ value: o, label: { en: o } })) : null;
    const { data, error } = await sb.from('template_questions').insert({
        section_id, label: { en: label }, type, order_index: nextIdx,
        is_required: is_required ?? true,
        options: optionsJson,
        help_text: help_text ? { en: help_text } : null,
        placeholder: placeholder ? { en: placeholder } : null,
    }).select('id').single();
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Question created: ${data.id}` }] };
});
// ═══════════════════════════════════════════════════════════════
// RESPONSE / REQUIREMENT TOOLS
// ═══════════════════════════════════════════════════════════════
server.tool('list_responses', 'List all responses for a project', { project_id: z.string().describe('Project UUID') }, async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('responses').select('id, respondent_email, status, progress_percent, summary_markdown, created_at, submitted_at').eq('project_id', project_id).order('created_at', { ascending: false });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
server.tool('get_response_answers', 'Get all answers for a specific response', { response_id: z.string().describe('Response UUID') }, async ({ response_id }) => {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('response_answers').select('id, question_id, value, voice_transcript, ai_clarification, updated_at').eq('response_id', response_id).order('updated_at');
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
server.tool('submit_answer', 'Submit or update an answer for a question in a response', {
    response_id: z.string().describe('Response UUID'),
    question_id: z.string().describe('Question UUID'),
    value: z.string().describe('The answer value'),
}, async ({ response_id, question_id, value }) => {
    const sb = getSupabaseClient();
    // Upsert: update if exists, insert if not
    const { data: existing } = await sb.from('response_answers').select('id').eq('response_id', response_id).eq('question_id', question_id).single();
    if (existing) {
        const { error } = await sb.from('response_answers').update({ value }).eq('id', existing.id);
        if (error)
            return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
        return { content: [{ type: 'text', text: 'Answer updated.' }] };
    }
    const { error } = await sb.from('response_answers').insert({ response_id, question_id, value });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Answer submitted.' }] };
});
// ═══════════════════════════════════════════════════════════════
// MEMBER / INVITATION TOOLS
// ═══════════════════════════════════════════════════════════════
server.tool('list_project_members', 'List members and invitations for a project', { project_id: z.string().describe('Project UUID') }, async ({ project_id }) => {
    const sb = getSupabaseClient();
    const [members, invitations] = await Promise.all([
        sb.rpc('get_project_members_info'),
        sb.from('magic_links').select('*').eq('project_id', project_id).order('created_at', { ascending: false }),
    ]);
    // Filter members to just this project (RPC returns all)
    const projectMembers = (members.data ?? []).filter((m) => m.project_id === project_id);
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({ members: projectMembers, invitations: invitations.data }, null, 2),
            }],
    };
});
server.tool('invite_member', 'Invite a client to a project by sending a magic link email. PREREQUISITE: project must be in active status. The magic link gives the client access to fill the form.', {
    project_id: z.string().describe('Project UUID'),
    email: z.string().email().describe('Client email address'),
    role: z.enum(['client', 'product_owner']).optional().default('client'),
}, async ({ project_id, email, role }) => {
    const sb = getSupabaseClient();
    // Validate project is active before inserting magic link
    const { data: proj } = await sb.from('projects').select('status, name').eq('id', project_id).single();
    if (!proj)
        return { content: [{ type: 'text', text: `Error: Project not found: ${project_id}` }] };
    if (proj.status !== 'active') {
        return { content: [{ type: 'text', text: `Cannot invite: project "${proj.name}" is '${proj.status}', not 'active'.\n\nInvitations only work on active projects.\nFull flow: draft → submit_for_review (PO) → approve_project (staff) → activate_project (staff) → active → invite_member` }] };
    }
    const { error } = await sb.from('magic_links').insert({
        project_id,
        email: email.toLowerCase(),
        role: role ?? 'client',
        token_hash: crypto.randomUUID(),
        status: 'sent',
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Invitation sent to ${email} for project "${proj.name}". ✓\n\nThe client will receive a magic link valid for 7 days to fill the requirement form.` }] };
});
// ═══════════════════════════════════════════════════════════════
// FEEDBACK TOOLS
// ═══════════════════════════════════════════════════════════════
server.tool('send_feedback', 'Send a feedback request to a project responder', {
    project_id: z.string().describe('Project UUID'),
    response_id: z.string().describe('Response UUID'),
    message: z.string().describe('Feedback question for the responder'),
}, async ({ project_id, response_id, message }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.from('feedback_requests').insert({
        project_id,
        response_id,
        question: message,
        status: 'pending',
    });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Feedback request sent.' }] };
});
// ═══════════════════════════════════════════════════════════════
// FORM FILLING TOOLS — Complete form workflow via MCP
// ═══════════════════════════════════════════════════════════════
server.tool('get_form_questions', 'Get all form questions for a project (sections + questions with IDs). Use this to know what question_ids to fill.', { project_id: z.string().describe('Project UUID') }, async ({ project_id }) => {
    const sb = getSupabaseClient();
    // Get project template
    const { data: project, error: pErr } = await sb.from('projects').select('id, name, slug, status, template_id').eq('id', project_id).single();
    if (pErr || !project)
        return { content: [{ type: 'text', text: `Error: ${pErr?.message ?? 'Project not found'}` }] };
    if (!project.template_id)
        return { content: [{ type: 'text', text: 'Error: Project has no template assigned.' }] };
    const [secs, qs] = await Promise.all([
        sb.from('template_sections').select('*').eq('template_id', project.template_id).order('order_index'),
        sb.from('template_questions').select('*').order('order_index'),
    ]);
    const secIds = new Set((secs.data ?? []).map(s => s.id));
    const questions = (qs.data ?? []).filter(q => secIds.has(q.section_id));
    const form = {
        project: { id: project.id, name: project.name, slug: project.slug, status: project.status },
        template_id: project.template_id,
        sections: (secs.data ?? []).map(s => ({
            id: s.id,
            title: s.title,
            description: s.description,
            questions: questions.filter(q => q.section_id === s.id).map(q => ({
                id: q.id,
                label: q.label,
                type: q.type,
                is_required: q.is_required,
                options: q.options,
                help_text: q.help_text,
                placeholder: q.placeholder,
            })),
        })),
    };
    return { content: [{ type: 'text', text: JSON.stringify(form, null, 2) }] };
});
server.tool('create_response', 'Create a new response for a project (starts form filling). Returns the response_id to use with submit_answer/fill_form.', {
    project_id: z.string().describe('Project UUID'),
    respondent_email: z.string().email().optional().describe('Respondent email. Auto-set from session if logged in.'),
    respondent_name: z.string().optional().describe('Respondent name'),
}, async ({ project_id, respondent_email, respondent_name }) => {
    const sb = getSupabaseClient();
    const session = getSession();
    // Get project + template
    const { data: project, error: pErr } = await sb.from('projects').select('id, template_id').eq('id', project_id).single();
    if (pErr || !project)
        return { content: [{ type: 'text', text: `Error: ${pErr?.message ?? 'Project not found'}` }] };
    if (!project.template_id)
        return { content: [{ type: 'text', text: 'Error: Project has no template. Approve or assign a template first.' }] };
    const email = respondent_email ?? session?.email ?? 'mcp@anforderungsportal.local';
    const { data, error } = await sb.from('responses').insert({
        project_id,
        template_id: project.template_id,
        respondent_email: email,
        respondent_name: respondent_name ?? null,
        respondent_id: session?.userId ?? null,
        status: 'in_progress',
        progress_percent: 0,
    }).select('id').single();
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Response created: ${data.id}\nUse fill_form or submit_answer to add answers, then submit_response to finalize.` }] };
});
server.tool('fill_form', 'Bulk-fill all answers for a response at once. Provide a JSON object mapping question_id → answer value.', {
    response_id: z.string().describe('Response UUID (from create_response)'),
    answers: z.string().describe('JSON object: { "question_uuid": "answer value", ... }. For file fields, pass the storage path from upload_file.'),
}, async ({ response_id, answers }) => {
    const sb = getSupabaseClient();
    let parsed;
    try {
        parsed = JSON.parse(answers);
    }
    catch {
        return { content: [{ type: 'text', text: 'Error: answers must be valid JSON object, e.g. {"question-id": "answer"}' }] };
    }
    const entries = Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0)
        return { content: [{ type: 'text', text: 'Error: No answers provided.' }] };
    const rows = entries.map(([questionId, value]) => ({
        response_id,
        question_id: questionId,
        value: value,
    }));
    const { error } = await sb.from('response_answers').upsert(rows, { onConflict: 'response_id,question_id' });
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    // Update progress
    const { data: allQs } = await sb.from('response_answers').select('id').eq('response_id', response_id);
    const answered = allQs?.length ?? 0;
    // Get total questions from the response's template
    const { data: resp } = await sb.from('responses').select('project_id').eq('id', response_id).single();
    let totalQuestions = answered;
    if (resp) {
        const { data: proj } = await sb.from('projects').select('template_id').eq('id', resp.project_id).single();
        if (proj?.template_id) {
            const { data: secs } = await sb.from('template_sections').select('id').eq('template_id', proj.template_id);
            const secIds = (secs ?? []).map(s => s.id);
            if (secIds.length > 0) {
                const { count } = await sb.from('template_questions').select('id', { count: 'exact', head: true }).in('section_id', secIds);
                totalQuestions = count ?? answered;
            }
        }
    }
    const progress = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;
    await sb.from('responses').update({ progress_percent: Math.min(progress, 100), status: 'in_progress' }).eq('id', response_id);
    return { content: [{ type: 'text', text: `${entries.length} answer(s) saved. Progress: ${Math.min(progress, 100)}%.\nUse submit_response to finalize.` }] };
});
server.tool('submit_response', 'Mark a response as submitted (finalizes the form). After this, the respondent cannot edit answers.', { response_id: z.string().describe('Response UUID') }, async ({ response_id }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.from('responses').update({
        status: 'submitted',
        progress_percent: 100,
        submitted_at: new Date().toISOString(),
    }).eq('id', response_id);
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Response submitted successfully. Staff can now review it.' }] };
});
server.tool('upload_file', 'Upload a file to a project for a specific question. Returns the storage path to use as the answer value in submit_answer/fill_form.', {
    project_id: z.string().describe('Project UUID'),
    question_id: z.string().describe('Question UUID (the file upload question)'),
    file_path: z.string().describe('Absolute local file path to upload'),
    response_id: z.string().optional().describe('Response UUID. If omitted, creates a temp upload folder.'),
}, async ({ project_id, question_id, file_path, response_id }) => {
    const sb = getSupabaseClient();
    const fs = await import('fs');
    const path = await import('path');
    // Verify file exists
    if (!fs.existsSync(file_path)) {
        return { content: [{ type: 'text', text: `Error: File not found: ${file_path}` }] };
    }
    // Get project slug
    const { data: project } = await sb.from('projects').select('slug').eq('id', project_id).single();
    if (!project)
        return { content: [{ type: 'text', text: 'Error: Project not found' }] };
    const fileBuffer = fs.readFileSync(file_path);
    const fileName = path.basename(file_path);
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = response_id || `temp-${Date.now()}`;
    const storagePath = `${project.slug}/${folder}/${question_id}/${Date.now()}-${safeName}`;
    // Detect MIME type from extension
    const ext = path.extname(file_path).toLowerCase();
    const mimeMap = {
        '.pdf': 'application/pdf', '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
        '.zip': 'application/zip', '.gz': 'application/gzip',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';
    const { error } = await sb.storage
        .from('response-attachments')
        .upload(storagePath, fileBuffer, { contentType, upsert: false });
    if (error)
        return { content: [{ type: 'text', text: `Upload error: ${error.message}` }] };
    // Also record in project_attachments for visibility
    const session = getSession();
    await sb.from('project_attachments').insert({
        project_id,
        uploaded_by: session?.userId ?? '00000000-0000-0000-0000-000000000000',
        file_name: fileName,
        file_size: fileBuffer.length,
        mime_type: contentType,
        storage_path: storagePath,
    }).single();
    return {
        content: [{
                type: 'text',
                text: `File uploaded: ${fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB)\nStorage path: ${storagePath}\n\nUse this path as the answer value for question ${question_id} in submit_answer or fill_form.`,
            }],
    };
});
// ═══════════════════════════════════════════════════════════════
// ANALYTICS / SEARCH TOOLS
// ═══════════════════════════════════════════════════════════════
server.tool('project_stats', 'Get summary statistics for a project (response count, completion rate, etc.)', { project_id: z.string().describe('Project UUID') }, async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { data: responses } = await sb.from('responses').select('id, status, progress_percent').eq('project_id', project_id);
    const total = responses?.length ?? 0;
    const submitted = responses?.filter(r => r.status === 'submitted').length ?? 0;
    const inProgress = responses?.filter(r => r.status === 'in_progress').length ?? 0;
    const avgProgress = total > 0 ? Math.round((responses.reduce((a, r) => a + (r.progress_percent ?? 0), 0)) / total) : 0;
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    total_responses: total,
                    submitted,
                    in_progress: inProgress,
                    draft: total - submitted - inProgress,
                    average_progress: avgProgress,
                }, null, 2),
            }],
    };
});
server.tool('search_projects', 'Search projects by name or description', { query: z.string().describe('Search query') }, async ({ query }) => {
    const sb = getSupabaseClient();
    // Sanitise PostgREST special characters to prevent filter injection
    const safe = query.replace(/[%_.*,()\\]/g, '');
    if (!safe.trim())
        return { content: [{ type: 'text', text: '[]' }] };
    const { data, error } = await sb.from('projects')
        .select('id, name, slug, status, description')
        .or(`name.ilike.%${safe}%,description.ilike.%${safe}%`)
        .limit(20);
    if (error)
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Anforderungsportal MCP server running on stdio');
}
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
