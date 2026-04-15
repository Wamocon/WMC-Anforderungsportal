/**
 * Integration Tests – Real Supabase DB
 *
 * These tests hit the live Supabase database to verify the MCP tools
 * work end-to-end with the actual anforderungsportal schema.
 *
 * Requires env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Run with: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx vitest run __tests__/integration.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Skip if env vars not set or key isn't a valid JWT (sb_secret_* format doesn't work with JS client)
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isValidJwt = !!key && key.startsWith('eyJ');
const shouldRun = !!url && isValidJwt;

const describeIf = shouldRun ? describe : describe.skip;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sb: any;

describeIf('Integration: Real Supabase DB', () => {
  beforeAll(() => {
    sb = createClient(url!, key!, {
      db: { schema: 'anforderungsportal' },
      auth: { persistSession: false },
    });
  });

  // ── Schema validation ──────────────────────────────────────

  describe('Schema exists', () => {
    it('projects table is accessible', async () => {
      const { data, error } = await sb.from('projects').select('id').limit(1);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('requirement_templates table is accessible', async () => {
      const { data, error } = await sb.from('requirement_templates').select('id').limit(1);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('template_sections table is accessible', async () => {
      const { data, error } = await sb.from('template_sections').select('id').limit(1);
      expect(error).toBeNull();
    });

    it('template_questions table is accessible', async () => {
      const { data, error } = await sb.from('template_questions').select('id').limit(1);
      expect(error).toBeNull();
    });

    it('responses table is accessible', async () => {
      const { data, error } = await sb.from('responses').select('id').limit(1);
      expect(error).toBeNull();
    });

    it('response_answers table is accessible', async () => {
      const { data, error } = await sb.from('response_answers').select('id').limit(1);
      expect(error).toBeNull();
    });

    it('project_members table is accessible', async () => {
      const { data, error } = await sb.from('project_members').select('user_id').limit(1);
      expect(error).toBeNull();
    });

    it('magic_links table is accessible', async () => {
      const { data, error } = await sb.from('magic_links').select('id').limit(1);
      expect(error).toBeNull();
    });

    it('feedback_requests table is accessible', async () => {
      const { data, error } = await sb.from('feedback_requests').select('id').limit(1);
      expect(error).toBeNull();
    });
  });

  // ── Data integrity ─────────────────────────────────────────

  describe('Data integrity', () => {
    it('default template exists', async () => {
      const { data, error } = await sb
        .from('requirement_templates')
        .select('id, name, is_default')
        .eq('is_default', true)
        .limit(1)
        .single();
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.is_default).toBe(true);
    });

    it('default template has sections', async () => {
      const { data: tmpl } = await sb
        .from('requirement_templates')
        .select('id')
        .eq('is_default', true)
        .limit(1)
        .single();
      const { data: sections, error } = await sb
        .from('template_sections')
        .select('id, title, order_index')
        .eq('template_id', tmpl.id)
        .order('order_index');
      expect(error).toBeNull();
      expect(sections.length).toBeGreaterThan(0);
    });

    it('default template sections have questions', async () => {
      const { data: tmpl } = await sb
        .from('requirement_templates')
        .select('id')
        .eq('is_default', true)
        .single();
      const { data: sections } = await sb
        .from('template_sections')
        .select('id')
        .eq('template_id', tmpl.id)
        .limit(1)
        .single();
      const { data: questions, error } = await sb
        .from('template_questions')
        .select('id, label, type')
        .eq('section_id', sections.id);
      expect(error).toBeNull();
      expect(questions.length).toBeGreaterThan(0);
    });
  });

  // ── CRUD operations ────────────────────────────────────────

  describe('CRUD operations', () => {
    let testProjectId: string;
    let testTemplateId: string;

    it('can list projects', async () => {
      const { data, error } = await sb.from('projects').select('*');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('can create a project', async () => {
      // Get default template
      const { data: tmpl } = await sb
        .from('requirement_templates')
        .select('id')
        .eq('is_default', true)
        .single();
      testTemplateId = tmpl.id;

      const slug = `integration-test-${Date.now()}`;
      const { data, error } = await sb
        .from('projects')
        .insert({
          name: 'Integration Test Project',
          slug,
          description: 'Created by automated integration test',
          template_id: tmpl.id,
          status: 'draft',
        })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Integration Test Project');
      testProjectId = data.id;
    });

    it('can get a specific project', async () => {
      const { data, error } = await sb
        .from('projects')
        .select('*')
        .eq('id', testProjectId)
        .single();
      expect(error).toBeNull();
      expect(data.name).toBe('Integration Test Project');
    });

    it('can update a project', async () => {
      const { error } = await sb
        .from('projects')
        .update({ description: 'Updated by integration test' })
        .eq('id', testProjectId);
      expect(error).toBeNull();

      const { data } = await sb
        .from('projects')
        .select('description')
        .eq('id', testProjectId)
        .single();
      expect(data.description).toBe('Updated by integration test');
    });

    it('can search projects', async () => {
      const { data, error } = await sb
        .from('projects')
        .select('*')
        .or('name.ilike.%Integration%,description.ilike.%Integration%');
      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });

    it('can submit project for review', async () => {
      const { error } = await sb
        .from('projects')
        .update({ status: 'in_review' })
        .eq('id', testProjectId);
      expect(error).toBeNull();
    });

    it('can approve project', async () => {
      const { error } = await sb
        .from('projects')
        .update({ status: 'approved' })
        .eq('id', testProjectId);
      expect(error).toBeNull();
    });

    it('can archive project', async () => {
      const { error } = await sb
        .from('projects')
        .update({ status: 'archived' })
        .eq('id', testProjectId);
      expect(error).toBeNull();
    });

    // Cleanup
    it('cleanup: delete test project', async () => {
      const { error } = await sb
        .from('projects')
        .delete()
        .eq('id', testProjectId);
      expect(error).toBeNull();
    });
  });

  // ── Template operations ────────────────────────────────────

  describe('Template operations', () => {
    let testTemplateId: string;
    let testSectionId: string;

    it('can list templates', async () => {
      const { data, error } = await sb
        .from('requirement_templates')
        .select('*')
        .order('created_at');
      expect(error).toBeNull();
      expect(data.length).toBeGreaterThan(0);
    });

    it('can create a template', async () => {
      const { data, error } = await sb
        .from('requirement_templates')
        .insert({
          name: `Integration Test Template ${Date.now()}`,
          description: 'Auto-created by integration test',
          is_default: false,
        })
        .select()
        .single();
      expect(error).toBeNull();
      testTemplateId = data.id;
    });

    it('can add a section to template', async () => {
      const { data, error } = await sb
        .from('template_sections')
        .insert({
          template_id: testTemplateId,
          title: 'Test Section',
          description: 'Integration test section',
          order_index: 0,
        })
        .select()
        .single();
      expect(error).toBeNull();
      testSectionId = data.id;
    });

    it('can add a question to section', async () => {
      const { data, error } = await sb
        .from('template_questions')
        .insert({
          section_id: testSectionId,
          label: 'Test Question',
          type: 'text',
          required: true,
          order_index: 0,
        })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data.label).toBe('Test Question');
    });

    // Cleanup
    it('cleanup: delete test template cascade', async () => {
      // Questions cascade from sections, sections cascade from template
      await sb.from('template_questions').delete().eq('section_id', testSectionId);
      await sb.from('template_sections').delete().eq('template_id', testTemplateId);
      const { error } = await sb.from('requirement_templates').delete().eq('id', testTemplateId);
      expect(error).toBeNull();
    });
  });

  // ── RPC functions ──────────────────────────────────────────

  describe('RPC functions', () => {
    it('get_project_members_info RPC exists', async () => {
      // Call with a nonexistent project - should return empty array, not error
      const { data, error } = await sb.rpc('get_project_members_info', {
        p_project_id: '00000000-0000-0000-0000-000000000000',
      });
      // RPC may return empty array or null, but should not be a function-not-found error
      if (error) {
        expect(error.message).not.toContain('function');
      }
    });
  });

  // ── Negative tests ─────────────────────────────────────────

  describe('Negative tests', () => {
    it('rejects insert with missing required fields', async () => {
      const { error } = await sb
        .from('projects')
        .insert({ name: null })
        .select()
        .single();
      expect(error).not.toBeNull();
    });

    it('rejects invalid UUID in query', async () => {
      const { data, error } = await sb
        .from('projects')
        .select('*')
        .eq('id', 'not-a-valid-uuid');
      // PostgREST may return error or empty array for invalid UUID format
      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toEqual([]);
      }
    });

    it('nonexistent table returns error', async () => {
      const { error } = await sb.from('nonexistent_table_xyz').select('*');
      expect(error).not.toBeNull();
    });
  });

  // ── Security tests ─────────────────────────────────────────

  describe('Security', () => {
    it('service role can bypass RLS', async () => {
      // Service role should be able to read all projects regardless of RLS
      const { data, error } = await sb.from('projects').select('id').limit(5);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('project_members has user_id column for RLS', async () => {
      const { data, error } = await sb
        .from('project_members')
        .select('user_id, role, project_id')
        .limit(1);
      expect(error).toBeNull();
    });
  });
});
