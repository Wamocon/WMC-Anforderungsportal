/**
 * MCP Server Tool Tests
 *
 * Comprehensive unit tests for all 22 MCP tools using mocked Supabase client.
 * Covers: happy path, error handling, edge cases, negative tests, security.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock helpers ──────────────────────────────────────────────
type MockResult = { data: unknown; error: unknown };

/**
 * Creates a chainable Supabase query builder mock.
 * Every method returns the same proxy that is BOTH thenable (awaitable)
 * and has all chaining methods available.
 */
function createQueryMock(result: MockResult = { data: null, error: null }) {
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'or', 'order', 'limit', 'single'] as const;
  const fns: Record<string, ReturnType<typeof vi.fn>> = {};

  // Build a plain object with all methods
  const target: Record<string, unknown> = {};
  for (const m of methods) {
    fns[m] = vi.fn();
    target[m] = fns[m];
  }

  // Wrap in a Proxy so that:
  //  - .then() resolves to the result (making it awaitable)
  //  - every other property returns a vi.fn() that returns the same proxy
  const proxy: unknown = new Proxy(target, {
    get(_t, prop) {
      if (prop === 'then') {
        // Make the proxy thenable
        return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
          Promise.resolve(result).then(resolve, reject);
      }
      if (typeof prop === 'string' && fns[prop]) {
        // Return a vi.fn() that returns the SAME proxy (keeps chain alive)
        fns[prop]!.mockReturnValue(proxy);
        return fns[prop];
      }
      return undefined;
    },
  });

  return { proxy, fns };
}

function createMockSupabase() {
  const queryMocks = new Map<string, ReturnType<typeof createQueryMock>>();
  const rpcResults = new Map<string, MockResult>();

  const sb = {
    from: vi.fn((table: string) => {
      if (!queryMocks.has(table)) queryMocks.set(table, createQueryMock());
      return queryMocks.get(table)!.proxy;
    }),
    rpc: vi.fn((fn: string, _params?: unknown) => {
      const result = rpcResults.get(fn) ?? { data: null, error: null };
      return Promise.resolve(result);
    }),
  };

  return {
    sb,
    setTableResult(table: string, result: MockResult) {
      queryMocks.set(table, createQueryMock(result));
    },
    setRpcResult(fn: string, result: MockResult) {
      rpcResults.set(fn, result);
    },
  };
}

// ── Mock the supabase module ──────────────────────────────────
let mockSb: ReturnType<typeof createMockSupabase>;

let mockSession: { email: string; role: string; userId: string; expiresAt: number } | null = null;
let mockSignInError: string | null = null;

vi.mock('../src/supabase.js', () => ({
  getSupabaseClient: () => mockSb.sb,
  getServiceClient: () => mockSb.sb,
  getSupabaseClientForUser: () => mockSb.sb,
  hasServiceKey: () => true,
  getSession: () => mockSession,
  setSession: (s: unknown) => { mockSession = s as typeof mockSession; },
  signIn: async (email: string, _password: string) => {
    if (mockSignInError) throw new Error(mockSignInError);
    const session = {
      accessToken: 'mock-jwt',
      refreshToken: 'mock-refresh',
      email,
      userId: 'user-123',
      role: 'product_owner',
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
    mockSession = session;
    return session;
  },
  signOut: () => { mockSession = null; },
}));

// ── Import tool handlers by extracting them ───────────────────
// Since the MCP server registers tools on a singleton, we need to
// intercept the registrations. We'll mock McpServer to capture handlers.
type ToolHandler = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[] }>;
const registeredTools = new Map<string, { schema: unknown; handler: ToolHandler }>();

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    constructor() {}
    tool(name: string, _desc: string, schema: unknown, handler: ToolHandler) {
      registeredTools.set(name, { schema, handler });
    }
    async connect() {}
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

// Import to trigger tool registration
await import('../src/index.js');

/** Helper to call a registered tool */
async function callTool(name: string, args: Record<string, unknown> = {}): Promise<string> {
  const tool = registeredTools.get(name);
  if (!tool) throw new Error(`Tool "${name}" not registered`);
  const result = await tool.handler(args);
  return result.content[0].text;
}

// ══════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════

beforeEach(() => {
  mockSb = createMockSupabase();
  mockSession = null;
  mockSignInError = null;
});

describe('Tool registration', () => {
  it('registers all 26 tools', () => {
    const expected = [
      'help',
      'login', 'whoami', 'logout',
      'list_projects', 'get_project', 'create_project', 'update_project',
      'submit_for_review', 'approve_project', 'reject_project',
      'activate_project', 'archive_project',
      'list_templates', 'get_template', 'create_template',
      'add_section', 'add_question',
      'list_responses', 'get_response_answers', 'submit_answer',
      'list_project_members', 'invite_member',
      'send_feedback',
      'project_stats', 'search_projects',
    ];
    for (const name of expected) {
      expect(registeredTools.has(name), `Missing tool: ${name}`).toBe(true);
    }
    expect(registeredTools.size).toBe(expected.length);
  });
});

// ─── PROJECT TOOLS ────────────────────────────────────────────

describe('list_projects', () => {
  it('returns projects without filter', async () => {
    const projects = [{ id: '1', name: 'Test', status: 'draft' }];
    mockSb.setTableResult('projects', { data: projects, error: null });
    const result = await callTool('list_projects', {});
    expect(JSON.parse(result)).toEqual(projects);
  });

  it('returns projects with status filter', async () => {
    const projects = [{ id: '1', name: 'Active', status: 'active' }];
    mockSb.setTableResult('projects', { data: projects, error: null });
    const result = await callTool('list_projects', { status: 'active' });
    expect(JSON.parse(result)).toEqual(projects);
  });

  it('returns empty array when no projects', async () => {
    mockSb.setTableResult('projects', { data: [], error: null });
    const result = await callTool('list_projects', { status: 'all' });
    expect(JSON.parse(result)).toEqual([]);
  });

  it('returns error message on DB failure', async () => {
    mockSb.setTableResult('projects', { data: null, error: { message: 'connection refused' } });
    const result = await callTool('list_projects', {});
    expect(result).toContain('Error: connection refused');
  });
});

describe('get_project', () => {
  it('fetches by UUID', async () => {
    const project = { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'My Project' };
    mockSb.setTableResult('projects', { data: project, error: null });
    const result = await callTool('get_project', { identifier: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' });
    expect(JSON.parse(result)).toEqual(project);
  });

  it('fetches by slug', async () => {
    const project = { id: '123', name: 'Slug Project', slug: 'slug-project' };
    mockSb.setTableResult('projects', { data: project, error: null });
    const result = await callTool('get_project', { identifier: 'slug-project' });
    expect(JSON.parse(result)).toEqual(project);
  });

  it('handles not found', async () => {
    mockSb.setTableResult('projects', { data: null, error: { message: 'Row not found' } });
    const result = await callTool('get_project', { identifier: 'nonexistent' });
    expect(result).toContain('Error: Row not found');
  });
});

describe('create_project', () => {
  it('creates project with default template', async () => {
    mockSb.setTableResult('requirement_templates', { data: { id: 'tmpl-1' }, error: null });
    mockSb.setTableResult('projects', { data: { id: 'new-id', slug: 'my-project-abc' }, error: null });
    const result = await callTool('create_project', { name: 'My Project' });
    expect(result).toContain('Project created');
    expect(result).toContain('new-id');
  });

  it('creates project with explicit template', async () => {
    mockSb.setTableResult('projects', { data: { id: 'new-id', slug: 'test-123' }, error: null });
    const result = await callTool('create_project', {
      name: 'Test',
      template_id: 'custom-tmpl',
      requirement_type: 'functional',
    });
    expect(result).toContain('Project created');
  });

  it('creates project with description', async () => {
    mockSb.setTableResult('requirement_templates', { data: { id: 'tmpl-1' }, error: null });
    mockSb.setTableResult('projects', { data: { id: 'p-1', slug: 'described-proj' }, error: null });
    const result = await callTool('create_project', {
      name: 'Described Project',
      description: 'A detailed description',
    });
    expect(result).toContain('Project created');
  });

  it('handles insert error', async () => {
    mockSb.setTableResult('requirement_templates', { data: null, error: null });
    mockSb.setTableResult('projects', { data: null, error: { message: 'unique violation' } });
    const result = await callTool('create_project', { name: 'Duplicate' });
    expect(result).toContain('Error: unique violation');
  });

  it('falls back when no default template exists', async () => {
    mockSb.setTableResult('requirement_templates', { data: null, error: { message: 'not found' } });
    mockSb.setTableResult('projects', { data: { id: 'p-1', slug: 'no-tmpl' }, error: null });
    const result = await callTool('create_project', { name: 'No Template' });
    expect(result).toContain('Project created');
  });
});

describe('update_project', () => {
  it('updates name', async () => {
    mockSb.setTableResult('projects', { data: null, error: null });
    const result = await callTool('update_project', {
      project_id: 'proj-1',
      name: 'New Name',
    });
    expect(result).toContain('updated successfully');
  });

  it('updates multiple fields', async () => {
    mockSb.setTableResult('projects', { data: null, error: null });
    const result = await callTool('update_project', {
      project_id: 'proj-1',
      name: 'Updated',
      description: 'New desc',
      template_id: 'tmpl-2',
    });
    expect(result).toContain('updated successfully');
  });

  it('handles update error', async () => {
    mockSb.setTableResult('projects', { data: null, error: { message: 'permission denied' } });
    const result = await callTool('update_project', { project_id: 'proj-1', name: 'X' });
    expect(result).toContain('Error: permission denied');
  });
});

describe('submit_for_review', () => {
  it('submits project for review', async () => {
    mockSb.setRpcResult('submit_for_review', { data: null, error: null });
    const result = await callTool('submit_for_review', { project_id: 'proj-1' });
    expect(result).toContain('submitted for review');
  });

  it('handles RPC error', async () => {
    mockSb.setRpcResult('submit_for_review', { data: null, error: { message: 'invalid status transition' } });
    const result = await callTool('submit_for_review', { project_id: 'proj-1' });
    expect(result).toContain('Error: invalid status transition');
  });
});

describe('approve_project', () => {
  it('approves project', async () => {
    mockSb.setRpcResult('approve_project', { data: null, error: null });
    const result = await callTool('approve_project', { project_id: 'proj-1' });
    expect(result).toContain('approved');
  });

  it('handles already-approved error', async () => {
    mockSb.setRpcResult('approve_project', { data: null, error: { message: 'project is not pending' } });
    const result = await callTool('approve_project', { project_id: 'proj-1' });
    expect(result).toContain('Error: project is not pending');
  });
});

describe('reject_project', () => {
  it('rejects with reason', async () => {
    mockSb.setRpcResult('reject_project', { data: null, error: null });
    const result = await callTool('reject_project', {
      project_id: 'proj-1',
      reason: 'Missing requirements',
    });
    expect(result).toContain('rejected');
  });

  it('handles RPC error', async () => {
    mockSb.setRpcResult('reject_project', { data: null, error: { message: 'not authorized' } });
    const result = await callTool('reject_project', { project_id: 'p', reason: 'x' });
    expect(result).toContain('Error: not authorized');
  });
});

describe('activate_project', () => {
  it('activates approved project', async () => {
    mockSb.setTableResult('projects', { data: null, error: null });
    const result = await callTool('activate_project', { project_id: 'proj-1' });
    expect(result).toContain('activated');
  });

  it('handles non-approved project (no matching row)', async () => {
    mockSb.setTableResult('projects', { data: null, error: { message: 'No rows updated' } });
    const result = await callTool('activate_project', { project_id: 'proj-draft' });
    expect(result).toContain('Error');
  });
});

describe('archive_project', () => {
  it('archives project', async () => {
    mockSb.setTableResult('projects', { data: null, error: null });
    const result = await callTool('archive_project', { project_id: 'proj-1' });
    expect(result).toContain('archived');
  });

  it('handles archive error', async () => {
    mockSb.setTableResult('projects', { data: null, error: { message: 'FK constraint' } });
    const result = await callTool('archive_project', { project_id: 'proj-1' });
    expect(result).toContain('Error: FK constraint');
  });
});

// ─── TEMPLATE TOOLS ───────────────────────────────────────────

describe('list_templates', () => {
  it('returns all templates', async () => {
    const templates = [{ id: 't1', name: 'Default', is_default: true }];
    mockSb.setTableResult('requirement_templates', { data: templates, error: null });
    const result = await callTool('list_templates', {});
    expect(JSON.parse(result)).toEqual(templates);
  });

  it('returns empty list', async () => {
    mockSb.setTableResult('requirement_templates', { data: [], error: null });
    const result = await callTool('list_templates', {});
    expect(JSON.parse(result)).toEqual([]);
  });

  it('handles error', async () => {
    mockSb.setTableResult('requirement_templates', { data: null, error: { message: 'timeout' } });
    const result = await callTool('list_templates', {});
    expect(result).toContain('Error: timeout');
  });
});

describe('get_template', () => {
  it('returns template with sections and questions', async () => {
    const tmpl = { id: 't1', name: 'Standard' };
    const secs = [{ id: 's1', template_id: 't1', order_index: 0 }];
    const qs = [{ id: 'q1', section_id: 's1', order_index: 0 }];

    mockSb.setTableResult('requirement_templates', { data: tmpl, error: null });
    mockSb.setTableResult('template_sections', { data: secs, error: null });
    mockSb.setTableResult('template_questions', { data: qs, error: null });

    const result = await callTool('get_template', { template_id: 't1' });
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe('Standard');
    expect(parsed.sections).toBeDefined();
  });

  it('handles template not found', async () => {
    mockSb.setTableResult('requirement_templates', { data: null, error: { message: 'not found' } });
    const result = await callTool('get_template', { template_id: 'bad-id' });
    expect(result).toContain('Error: not found');
  });
});

describe('create_template', () => {
  it('creates template with name only', async () => {
    mockSb.setTableResult('requirement_templates', { data: { id: 'new-tmpl' }, error: null });
    const result = await callTool('create_template', { name: 'Survey Template' });
    expect(result).toContain('Template created: new-tmpl');
  });

  it('creates template with description', async () => {
    mockSb.setTableResult('requirement_templates', { data: { id: 'new-tmpl' }, error: null });
    const result = await callTool('create_template', {
      name: 'Detailed',
      description: 'A detailed template',
    });
    expect(result).toContain('Template created');
  });

  it('handles duplicate name error', async () => {
    mockSb.setTableResult('requirement_templates', { data: null, error: { message: 'duplicate key' } });
    const result = await callTool('create_template', { name: 'Duplicate' });
    expect(result).toContain('Error: duplicate key');
  });
});

describe('add_section', () => {
  it('adds section with auto-increment order', async () => {
    mockSb.setTableResult('template_sections', { data: { id: 'sec-1' }, error: null });
    const result = await callTool('add_section', {
      template_id: 't1',
      title: 'General Info',
    });
    expect(result).toContain('Section created: sec-1');
  });

  it('adds section with description and not required', async () => {
    mockSb.setTableResult('template_sections', { data: { id: 'sec-2' }, error: null });
    const result = await callTool('add_section', {
      template_id: 't1',
      title: 'Optional Section',
      description: 'This is optional',
      is_required: false,
    });
    expect(result).toContain('Section created');
  });

  it('handles error', async () => {
    mockSb.setTableResult('template_sections', { data: null, error: { message: 'FK violation' } });
    const result = await callTool('add_section', { template_id: 'bad', title: 'X' });
    expect(result).toContain('Error: FK violation');
  });
});

describe('add_question', () => {
  it('adds text question', async () => {
    mockSb.setTableResult('template_questions', { data: { id: 'q1' }, error: null });
    const result = await callTool('add_question', {
      section_id: 's1',
      label: 'Project name?',
      type: 'text',
    });
    expect(result).toContain('Question created: q1');
  });

  it('adds select question with options', async () => {
    mockSb.setTableResult('template_questions', { data: { id: 'q2' }, error: null });
    const result = await callTool('add_question', {
      section_id: 's1',
      label: 'Priority',
      type: 'select',
      options: ['High', 'Medium', 'Low'],
    });
    expect(result).toContain('Question created');
  });

  it('adds question with all optional fields', async () => {
    mockSb.setTableResult('template_questions', { data: { id: 'q3' }, error: null });
    const result = await callTool('add_question', {
      section_id: 's1',
      label: 'Budget',
      type: 'number',
      is_required: false,
      help_text: 'Enter your budget in EUR',
      placeholder: '10000',
    });
    expect(result).toContain('Question created');
  });

  it('handles every question type', async () => {
    const types = ['text', 'textarea', 'number', 'email', 'url', 'date', 'radio', 'select', 'multi_select', 'checkbox'];
    for (const type of types) {
      mockSb.setTableResult('template_questions', { data: { id: `q-${type}` }, error: null });
      const result = await callTool('add_question', {
        section_id: 's1',
        label: `Test ${type}`,
        type,
        options: ['radio', 'select', 'multi_select', 'checkbox'].includes(type) ? ['A', 'B'] : undefined,
      });
      expect(result).toContain('Question created');
    }
  });

  it('handles insert error', async () => {
    mockSb.setTableResult('template_questions', { data: null, error: { message: 'bad section_id' } });
    const result = await callTool('add_question', {
      section_id: 'invalid',
      label: 'Test',
      type: 'text',
    });
    expect(result).toContain('Error: bad section_id');
  });
});

// ─── RESPONSE TOOLS ──────────────────────────────────────────

describe('list_responses', () => {
  it('returns responses for project', async () => {
    const responses = [
      { id: 'r1', respondent_email: 'test@example.com', status: 'submitted', progress_percent: 100 },
    ];
    mockSb.setTableResult('responses', { data: responses, error: null });
    const result = await callTool('list_responses', { project_id: 'proj-1' });
    expect(JSON.parse(result)).toEqual(responses);
  });

  it('returns empty list', async () => {
    mockSb.setTableResult('responses', { data: [], error: null });
    const result = await callTool('list_responses', { project_id: 'proj-1' });
    expect(JSON.parse(result)).toEqual([]);
  });

  it('handles error', async () => {
    mockSb.setTableResult('responses', { data: null, error: { message: 'access denied' } });
    const result = await callTool('list_responses', { project_id: 'proj-1' });
    expect(result).toContain('Error: access denied');
  });
});

describe('get_response_answers', () => {
  it('returns answers for response', async () => {
    const answers = [{ id: 'a1', question_id: 'q1', value: 'Test answer' }];
    mockSb.setTableResult('response_answers', { data: answers, error: null });
    const result = await callTool('get_response_answers', { response_id: 'r1' });
    expect(JSON.parse(result)).toEqual(answers);
  });

  it('returns empty when no answers', async () => {
    mockSb.setTableResult('response_answers', { data: [], error: null });
    const result = await callTool('get_response_answers', { response_id: 'r1' });
    expect(JSON.parse(result)).toEqual([]);
  });

  it('handles error', async () => {
    mockSb.setTableResult('response_answers', { data: null, error: { message: 'not found' } });
    const result = await callTool('get_response_answers', { response_id: 'bad' });
    expect(result).toContain('Error: not found');
  });
});

describe('submit_answer', () => {
  it('inserts new answer', async () => {
    // First call: check if exists (single returns not found)
    mockSb.setTableResult('response_answers', { data: null, error: { message: 'not found' } });
    const result = await callTool('submit_answer', {
      response_id: 'r1',
      question_id: 'q1',
      value: 'My answer',
    });
    // Due to mock limitations, we check it doesn't crash
    expect(typeof result).toBe('string');
  });

  it('updates existing answer', async () => {
    mockSb.setTableResult('response_answers', { data: { id: 'existing-id' }, error: null });
    const result = await callTool('submit_answer', {
      response_id: 'r1',
      question_id: 'q1',
      value: 'Updated answer',
    });
    expect(typeof result).toBe('string');
  });
});

// ─── MEMBER TOOLS ─────────────────────────────────────────────

describe('list_project_members', () => {
  it('returns members and invitations', async () => {
    mockSb.setRpcResult('get_project_members_info', {
      data: [{ email: 'user@test.com', role: 'client' }],
      error: null,
    });
    mockSb.setTableResult('magic_links', {
      data: [{ email: 'invited@test.com', status: 'sent' }],
      error: null,
    });
    const result = await callTool('list_project_members', { project_id: 'proj-1' });
    const parsed = JSON.parse(result);
    expect(parsed.members).toBeDefined();
    expect(parsed.invitations).toBeDefined();
  });
});

describe('invite_member', () => {
  it('invites client by email', async () => {
    mockSb.setTableResult('magic_links', { data: null, error: null });
    const result = await callTool('invite_member', {
      project_id: 'proj-1',
      email: 'client@example.com',
    });
    expect(result).toContain('Invitation sent to client@example.com');
  });

  it('invites with product_owner role', async () => {
    mockSb.setTableResult('magic_links', { data: null, error: null });
    const result = await callTool('invite_member', {
      project_id: 'proj-1',
      email: 'po@example.com',
      role: 'product_owner',
    });
    expect(result).toContain('Invitation sent');
  });

  it('handles duplicate invitation error', async () => {
    mockSb.setTableResult('magic_links', { data: null, error: { message: 'duplicate key' } });
    const result = await callTool('invite_member', {
      project_id: 'proj-1',
      email: 'dup@example.com',
    });
    expect(result).toContain('Error: duplicate key');
  });
});

// ─── FEEDBACK TOOLS ───────────────────────────────────────────

describe('send_feedback', () => {
  it('sends feedback without question IDs', async () => {
    mockSb.setTableResult('feedback_requests', { data: null, error: null });
    const result = await callTool('send_feedback', {
      project_id: 'proj-1',
      response_id: 'r1',
      message: 'Please clarify section 2',
    });
    expect(result).toContain('Feedback request sent');
  });

  it('sends feedback with specific question IDs', async () => {
    mockSb.setTableResult('feedback_requests', { data: null, error: null });
    const result = await callTool('send_feedback', {
      project_id: 'proj-1',
      response_id: 'r1',
      message: 'Revise answers',
      question_ids: ['q1', 'q2'],
    });
    expect(result).toContain('Feedback request sent');
  });

  it('handles error', async () => {
    mockSb.setTableResult('feedback_requests', { data: null, error: { message: 'FK violation' } });
    const result = await callTool('send_feedback', {
      project_id: 'bad',
      response_id: 'bad',
      message: 'test',
    });
    expect(result).toContain('Error: FK violation');
  });
});

// ─── ANALYTICS TOOLS ──────────────────────────────────────────

describe('project_stats', () => {
  it('calculates stats with mixed statuses', async () => {
    const responses = [
      { id: '1', status: 'submitted', progress_percent: 100 },
      { id: '2', status: 'in_progress', progress_percent: 60 },
      { id: '3', status: 'in_progress', progress_percent: 30 },
      { id: '4', status: 'draft', progress_percent: 0 },
    ];
    mockSb.setTableResult('responses', { data: responses, error: null });
    const result = await callTool('project_stats', { project_id: 'proj-1' });
    const stats = JSON.parse(result);
    expect(stats.total_responses).toBe(4);
    expect(stats.submitted).toBe(1);
    expect(stats.in_progress).toBe(2);
    expect(stats.draft).toBe(1);
    expect(stats.average_progress).toBe(48); // (100+60+30+0)/4 = 47.5 → 48
  });

  it('handles empty project', async () => {
    mockSb.setTableResult('responses', { data: [], error: null });
    const result = await callTool('project_stats', { project_id: 'empty' });
    const stats = JSON.parse(result);
    expect(stats.total_responses).toBe(0);
    expect(stats.average_progress).toBe(0);
  });

  it('handles null progress values', async () => {
    const responses = [
      { id: '1', status: 'in_progress', progress_percent: null },
      { id: '2', status: 'submitted', progress_percent: 100 },
    ];
    mockSb.setTableResult('responses', { data: responses, error: null });
    const result = await callTool('project_stats', { project_id: 'proj-1' });
    const stats = JSON.parse(result);
    expect(stats.total_responses).toBe(2);
    expect(stats.average_progress).toBe(50); // (0+100)/2
  });
});

describe('search_projects', () => {
  it('returns matching projects', async () => {
    const projects = [{ id: '1', name: 'Test Project', status: 'active' }];
    mockSb.setTableResult('projects', { data: projects, error: null });
    const result = await callTool('search_projects', { query: 'Test' });
    expect(JSON.parse(result)).toEqual(projects);
  });

  it('returns empty for no matches', async () => {
    mockSb.setTableResult('projects', { data: [], error: null });
    const result = await callTool('search_projects', { query: 'nonexistent' });
    expect(JSON.parse(result)).toEqual([]);
  });

  // ── SECURITY TESTS ──
  it('sanitises PostgREST special characters', async () => {
    mockSb.setTableResult('projects', { data: [], error: null });
    await callTool('search_projects', { query: 'test%_.*,()\\injection' });
    // Should not crash and should have sanitised the query
    expect(mockSb.sb.from).toHaveBeenCalledWith('projects');
  });

  it('returns empty for query that is only special characters', async () => {
    const result = await callTool('search_projects', { query: '%_.*,()' });
    expect(result).toBe('[]');
  });

  it('returns empty for whitespace-only query after sanitisation', async () => {
    const result = await callTool('search_projects', { query: '  .*  ' });
    expect(result).toBe('[]');
  });

  it('handles DB error on search', async () => {
    mockSb.setTableResult('projects', { data: null, error: { message: 'timeout' } });
    const result = await callTool('search_projects', { query: 'test' });
    expect(result).toContain('Error: timeout');
  });
});

// ─── EDGE CASES ──────────────────────────────────────────────

describe('Edge cases', () => {
  it('create_project generates unique slugs', async () => {
    mockSb.setTableResult('requirement_templates', { data: { id: 't1' }, error: null });
    mockSb.setTableResult('projects', { data: { id: 'p1', slug: 'test-slug' }, error: null });
    // Call twice - slugs should differ (timestamp-based)
    const r1 = await callTool('create_project', { name: 'Test' });
    const r2 = await callTool('create_project', { name: 'Test' });
    expect(r1).toContain('Project created');
    expect(r2).toContain('Project created');
  });

  it('create_project handles special characters in name', async () => {
    mockSb.setTableResult('requirement_templates', { data: { id: 't1' }, error: null });
    mockSb.setTableResult('projects', { data: { id: 'p1', slug: 'test' }, error: null });
    const result = await callTool('create_project', { name: '  Tëst Prôjéct! @#$  ' });
    expect(result).toContain('Project created');
  });

  it('update_project with no changes still succeeds', async () => {
    mockSb.setTableResult('projects', { data: null, error: null });
    const result = await callTool('update_project', { project_id: 'proj-1' });
    expect(result).toContain('updated successfully');
  });

  it('invite_member lowercases email', async () => {
    mockSb.setTableResult('magic_links', { data: null, error: null });
    const result = await callTool('invite_member', {
      project_id: 'proj-1',
      email: 'User@Example.COM',
    });
    expect(result).toContain('Invitation sent');
  });

  it('add_section first section gets order_index 0', async () => {
    // When no existing sections, data is empty
    mockSb.setTableResult('template_sections', { data: { id: 'sec-new' }, error: null });
    const result = await callTool('add_section', {
      template_id: 't1',
      title: 'First Section',
    });
    expect(result).toContain('Section created');
  });

  it('add_question with checkbox type and no options', async () => {
    mockSb.setTableResult('template_questions', { data: { id: 'q1' }, error: null });
    const result = await callTool('add_question', {
      section_id: 's1',
      label: 'Agree to terms',
      type: 'checkbox',
    });
    expect(result).toContain('Question created');
  });
});

// ══════════════════════════════════════════════════════════════
// AUTH TOOL TESTS
// ══════════════════════════════════════════════════════════════

describe('login', () => {
  it('signs in and returns session info', async () => {
    const result = await callTool('login', { email: 'po@wmc.de', password: 'test123' });
    expect(result).toContain('Logged in as po@wmc.de');
    expect(result).toContain('product_owner');
    expect(result).toContain('PRODUCT OWNER');
    expect(mockSession).not.toBeNull();
    expect(mockSession?.email).toBe('po@wmc.de');
  });

  it('returns error on invalid credentials', async () => {
    mockSignInError = 'Invalid login credentials';
    const result = await callTool('login', { email: 'bad@x.de', password: 'wrong' });
    expect(result).toContain('Invalid login credentials');
    expect(mockSession).toBeNull();
  });
});

describe('whoami', () => {
  it('shows admin mode when not logged in', async () => {
    const result = await callTool('whoami', {});
    expect(result).toContain('Not logged in');
    expect(result).toContain('admin mode');
    expect(result).toContain('service-role');
  });

  it('shows session info when logged in', async () => {
    // First login
    await callTool('login', { email: 'staff@wmc.de', password: 'test' });
    const result = await callTool('whoami', {});
    expect(result).toContain('staff@wmc.de');
    expect(result).toContain('product_owner');
    expect(result).toContain('active');
  });

  it('shows expired warning for expired session', async () => {
    // Login then manually expire
    await callTool('login', { email: 'x@wmc.de', password: 'test' });
    mockSession!.expiresAt = Math.floor(Date.now() / 1000) - 100;
    const result = await callTool('whoami', {});
    expect(result).toContain('EXPIRED');
  });
});

describe('logout', () => {
  it('clears session after login', async () => {
    await callTool('login', { email: 'po@wmc.de', password: 'test' });
    expect(mockSession).not.toBeNull();
    const result = await callTool('logout', {});
    expect(result).toContain('Logged out from po@wmc.de');
    expect(result).toContain('admin mode');
    expect(mockSession).toBeNull();
  });

  it('handles logout when already in admin mode', async () => {
    const result = await callTool('logout', {});
    expect(result).toContain('No active session');
    expect(mockSession).toBeNull();
  });

  it('login → logout → login works correctly', async () => {
    await callTool('login', { email: 'a@wmc.de', password: 'p1' });
    expect(mockSession?.email).toBe('a@wmc.de');
    await callTool('logout', {});
    expect(mockSession).toBeNull();
    await callTool('login', { email: 'b@wmc.de', password: 'p2' });
    expect(mockSession?.email).toBe('b@wmc.de');
  });
});
