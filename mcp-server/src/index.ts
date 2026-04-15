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
import { getSupabaseClient } from './supabase.js';

const server = new McpServer({
  name: 'anforderungsportal',
  version: '1.0.0',
});

// ═══════════════════════════════════════════════════════════════
// PROJECT TOOLS
// ═══════════════════════════════════════════════════════════════

server.tool(
  'list_projects',
  'List all projects with optional status filter',
  { status: z.enum(['all', 'draft', 'pending_review', 'active', 'approved', 'archived']).optional().describe('Filter by project status') },
  async ({ status }) => {
    const sb = getSupabaseClient();
    let q = sb.from('projects').select('id, name, slug, status, description, requirement_type, created_at, deadline_days');
    if (status && status !== 'all') q = q.eq('status', status);
    q = q.order('created_at', { ascending: false }).limit(50);
    const { data, error } = await q;
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'get_project',
  'Get detailed project information by ID or slug',
  { identifier: z.string().describe('Project ID (UUID) or slug') },
  async ({ identifier }) => {
    const sb = getSupabaseClient();
    const isUuid = /^[0-9a-f]{8}-/.test(identifier);
    const col = isUuid ? 'id' : 'slug';
    const { data, error } = await sb.from('projects').select('*').eq(col, identifier).single();
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'create_project',
  'Create a new project (draft status). POs use this to propose a project.',
  {
    name: z.string().describe('Project name'),
    description: z.string().optional().describe('Project description'),
    requirement_type: z.enum(['functional', 'non_functional', 'both']).optional().default('both'),
    template_id: z.string().optional().describe('Template ID. Omit to use default.'),
  },
  async ({ name, description, requirement_type, template_id }) => {
    const sb = getSupabaseClient();

    // Get default template if not specified
    let tid = template_id;
    if (!tid) {
      const { data: def } = await sb.from('requirement_templates').select('id').eq('is_default', true).single();
      tid = def?.id ?? undefined;
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    const { data, error } = await sb.from('projects').insert({
      name, description: description ?? null, slug,
      status: 'draft', requirement_type: requirement_type ?? 'both',
      template_id: tid ?? null, deadline_days: 5,
    }).select('id, slug').single();

    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Project created: ${JSON.stringify(data)}` }] };
  }
);

server.tool(
  'update_project',
  'Update project name, description, or template',
  {
    project_id: z.string().describe('Project UUID'),
    name: z.string().optional(),
    description: z.string().optional(),
    template_id: z.string().optional(),
  },
  async ({ project_id, name, description, template_id }) => {
    const sb = getSupabaseClient();
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (template_id !== undefined) updates.template_id = template_id;
    const { error } = await sb.from('projects').update(updates).eq('id', project_id);
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Project updated successfully.' }] };
  }
);

server.tool(
  'submit_for_review',
  'Submit a draft project for staff review (PO action)',
  { project_id: z.string().describe('Project UUID') },
  async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.rpc('submit_for_review', { p_project_id: project_id });
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Project submitted for review.' }] };
  }
);

server.tool(
  'approve_project',
  'Approve a pending project (Staff/Admin action)',
  { project_id: z.string().describe('Project UUID') },
  async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.rpc('approve_project', { p_project_id: project_id });
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Project approved.' }] };
  }
);

server.tool(
  'reject_project',
  'Reject a pending project and send it back to draft (Staff/Admin action)',
  {
    project_id: z.string().describe('Project UUID'),
    reason: z.string().describe('Reason for rejection'),
  },
  async ({ project_id, reason }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.rpc('reject_project', { p_project_id: project_id, p_reason: reason });
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Project rejected and returned to draft.' }] };
  }
);

server.tool(
  'activate_project',
  'Activate an approved project for client form-filling (Staff/Admin action)',
  { project_id: z.string().describe('Project UUID') },
  async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.from('projects').update({ status: 'active' }).eq('id', project_id).eq('status', 'approved');
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Project activated.' }] };
  }
);

server.tool(
  'archive_project',
  'Archive a project',
  { project_id: z.string().describe('Project UUID') },
  async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.from('projects').update({ status: 'archived' }).eq('id', project_id);
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Project archived.' }] };
  }
);

// ═══════════════════════════════════════════════════════════════
// TEMPLATE TOOLS
// ═══════════════════════════════════════════════════════════════

server.tool(
  'list_templates',
  'List all requirement templates',
  {},
  async () => {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('requirement_templates').select('id, name, description, is_default, created_at').order('is_default', { ascending: false });
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'get_template',
  'Get a template with all its sections and questions',
  { template_id: z.string().describe('Template UUID') },
  async ({ template_id }) => {
    const sb = getSupabaseClient();
    const [tmpl, secs, qs] = await Promise.all([
      sb.from('requirement_templates').select('*').eq('id', template_id).single(),
      sb.from('template_sections').select('*').eq('template_id', template_id).order('order_index'),
      sb.from('template_questions').select('*').order('order_index'),
    ]);
    if (tmpl.error) return { content: [{ type: 'text', text: `Error: ${tmpl.error.message}` }] };

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
  }
);

server.tool(
  'create_template',
  'Create a new requirement template',
  {
    name: z.string().describe('Template name'),
    description: z.string().optional().describe('Template description'),
  },
  async ({ name, description }) => {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('requirement_templates').insert({
      name, description: description ?? null, is_default: false,
    }).select('id').single();
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Template created: ${data.id}` }] };
  }
);

server.tool(
  'add_section',
  'Add a section to a template',
  {
    template_id: z.string().describe('Template UUID'),
    title: z.string().describe('Section title'),
    description: z.string().optional(),
    is_required: z.boolean().optional().default(true),
  },
  async ({ template_id, title, description, is_required }) => {
    const sb = getSupabaseClient();
    const { data: existing } = await sb.from('template_sections').select('order_index').eq('template_id', template_id).order('order_index', { ascending: false }).limit(1);
    const nextIdx = (existing?.[0]?.order_index ?? -1) + 1;

    const { data, error } = await sb.from('template_sections').insert({
      template_id, title: { en: title }, description: description ? { en: description } : null,
      order_index: nextIdx, is_required: is_required ?? true,
    }).select('id').single();
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Section created: ${data.id}` }] };
  }
);

server.tool(
  'add_question',
  'Add a question to a template section',
  {
    section_id: z.string().describe('Section UUID'),
    label: z.string().describe('Question text'),
    type: z.enum(['text', 'textarea', 'number', 'email', 'url', 'date', 'radio', 'select', 'multi_select', 'checkbox']).describe('Question type'),
    options: z.array(z.string()).optional().describe('Options for radio/select/multi_select/checkbox'),
    is_required: z.boolean().optional().default(true),
    help_text: z.string().optional(),
    placeholder: z.string().optional(),
  },
  async ({ section_id, label, type, options, is_required, help_text, placeholder }) => {
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
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Question created: ${data.id}` }] };
  }
);

// ═══════════════════════════════════════════════════════════════
// RESPONSE / REQUIREMENT TOOLS
// ═══════════════════════════════════════════════════════════════

server.tool(
  'list_responses',
  'List all responses for a project',
  { project_id: z.string().describe('Project UUID') },
  async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('project_responses').select('id, respondent_email, status, progress, summary, created_at, submitted_at').eq('project_id', project_id).order('created_at', { ascending: false });
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'get_response_answers',
  'Get all answers for a specific response',
  { response_id: z.string().describe('Response UUID') },
  async ({ response_id }) => {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('response_answers').select('id, question_id, value, ai_polished, ai_suggestions, updated_at').eq('response_id', response_id).order('updated_at');
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'submit_answer',
  'Submit or update an answer for a question in a response',
  {
    response_id: z.string().describe('Response UUID'),
    question_id: z.string().describe('Question UUID'),
    value: z.string().describe('The answer value'),
  },
  async ({ response_id, question_id, value }) => {
    const sb = getSupabaseClient();
    // Upsert: update if exists, insert if not
    const { data: existing } = await sb.from('response_answers').select('id').eq('response_id', response_id).eq('question_id', question_id).single();

    if (existing) {
      const { error } = await sb.from('response_answers').update({ value }).eq('id', existing.id);
      if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      return { content: [{ type: 'text', text: 'Answer updated.' }] };
    }

    const { error } = await sb.from('response_answers').insert({ response_id, question_id, value });
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Answer submitted.' }] };
  }
);

// ═══════════════════════════════════════════════════════════════
// MEMBER / INVITATION TOOLS
// ═══════════════════════════════════════════════════════════════

server.tool(
  'list_project_members',
  'List members and invitations for a project',
  { project_id: z.string().describe('Project UUID') },
  async ({ project_id }) => {
    const sb = getSupabaseClient();
    const [members, invitations] = await Promise.all([
      sb.rpc('get_project_members', { p_project_id: project_id }),
      sb.from('project_invitations').select('*').eq('project_id', project_id).order('created_at', { ascending: false }),
    ]);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ members: members.data, invitations: invitations.data }, null, 2),
      }],
    };
  }
);

server.tool(
  'invite_member',
  'Invite a client to a project by email',
  {
    project_id: z.string().describe('Project UUID'),
    email: z.string().email().describe('Client email address'),
    role: z.enum(['client', 'product_owner']).optional().default('client'),
  },
  async ({ project_id, email, role }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.from('project_invitations').insert({
      project_id,
      email: email.toLowerCase(),
      role: role ?? 'client',
      status: 'sent',
    });
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: `Invitation sent to ${email}` }] };
  }
);

// ═══════════════════════════════════════════════════════════════
// FEEDBACK TOOLS
// ═══════════════════════════════════════════════════════════════

server.tool(
  'send_feedback',
  'Send a feedback request to a project responder',
  {
    project_id: z.string().describe('Project UUID'),
    response_id: z.string().describe('Response UUID'),
    message: z.string().describe('Feedback message for the responder'),
    question_ids: z.array(z.string()).optional().describe('Specific question IDs the feedback is about'),
  },
  async ({ project_id, response_id, message, question_ids }) => {
    const sb = getSupabaseClient();
    const { error } = await sb.from('feedback_requests').insert({
      project_id,
      response_id,
      message,
      question_ids: question_ids ?? null,
      status: 'pending',
    });
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: 'Feedback request sent.' }] };
  }
);

// ═══════════════════════════════════════════════════════════════
// ANALYTICS / SEARCH TOOLS
// ═══════════════════════════════════════════════════════════════

server.tool(
  'project_stats',
  'Get summary statistics for a project (response count, completion rate, etc.)',
  { project_id: z.string().describe('Project UUID') },
  async ({ project_id }) => {
    const sb = getSupabaseClient();
    const { data: responses } = await sb.from('project_responses').select('id, status, progress').eq('project_id', project_id);

    const total = responses?.length ?? 0;
    const submitted = responses?.filter(r => r.status === 'submitted').length ?? 0;
    const inProgress = responses?.filter(r => r.status === 'in_progress').length ?? 0;
    const avgProgress = total > 0 ? Math.round((responses!.reduce((a, r) => a + (r.progress ?? 0), 0)) / total) : 0;

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
  }
);

server.tool(
  'search_projects',
  'Search projects by name or description',
  { query: z.string().describe('Search query') },
  async ({ query }) => {
    const sb = getSupabaseClient();
    const { data, error } = await sb.from('projects')
      .select('id, name, slug, status, description')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(20);
    if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

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
