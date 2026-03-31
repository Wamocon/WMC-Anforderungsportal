-- WMC Anforderungsportal - Initial Schema
-- Multi-tenant requirement collection platform

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- SCHEMA SETUP
-- ============================================
-- Dedicated schema for Anforderungsportal (Requirement Collection Portal).
-- Separated from other apps sharing this Supabase project (e.g. KI-Manager).
CREATE SCHEMA IF NOT EXISTS anforderungsportal;
GRANT USAGE ON SCHEMA anforderungsportal TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA anforderungsportal TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA anforderungsportal TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anforderungsportal
  GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anforderungsportal
  GRANT ALL ON SEQUENCES TO authenticated, service_role;


-- ============================================
-- ORGANIZATIONS
-- ============================================
create table anforderungsportal.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  created_at timestamptz default now() not null
);

alter table anforderungsportal.organizations enable row level security;

-- ============================================
-- PROJECTS
-- ============================================
create table anforderungsportal.projects (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references anforderungsportal.organizations(id) on delete cascade not null,
  name text not null,
  slug text not null,
  description text,
  status text default 'draft' not null check (status in ('draft', 'active', 'archived')),
  welcome_text jsonb default '{}' not null,
  deadline_days integer default 5 not null,
  template_id uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(org_id, slug)
);

create index idx_projects_org_id on anforderungsportal.projects(org_id);
create index idx_projects_status on anforderungsportal.projects(status);

alter table anforderungsportal.projects enable row level security;

-- ============================================
-- PROJECT MEMBERS
-- ============================================
create table anforderungsportal.project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references anforderungsportal.projects(id) on delete cascade not null,
  user_id uuid not null,
  role text default 'client' not null check (role in ('super_admin', 'product_owner', 'client')),
  created_at timestamptz default now() not null,
  unique(project_id, user_id)
);

create index idx_project_members_user_id on anforderungsportal.project_members(user_id);
create index idx_project_members_project_id on anforderungsportal.project_members(project_id);

alter table anforderungsportal.project_members enable row level security;

-- ============================================
-- REQUIREMENT TEMPLATES
-- ============================================
create table anforderungsportal.requirement_templates (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references anforderungsportal.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_default boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_templates_org_id on anforderungsportal.requirement_templates(org_id);

alter table anforderungsportal.requirement_templates enable row level security;

-- Add the FK now that templates table exists
alter table anforderungsportal.projects
  add constraint fk_projects_template
  foreign key (template_id) references anforderungsportal.requirement_templates(id) on delete set null;

-- ============================================
-- TEMPLATE SECTIONS
-- ============================================
create table anforderungsportal.template_sections (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references anforderungsportal.requirement_templates(id) on delete cascade not null,
  title jsonb not null default '{}',
  description jsonb,
  order_index integer not null default 0,
  is_required boolean default true not null
);

create index idx_sections_template_id on anforderungsportal.template_sections(template_id);

alter table anforderungsportal.template_sections enable row level security;

-- ============================================
-- TEMPLATE QUESTIONS
-- ============================================
create table anforderungsportal.template_questions (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references anforderungsportal.template_sections(id) on delete cascade not null,
  type text not null check (type in ('text', 'textarea', 'select', 'multi_select', 'radio', 'checkbox', 'file', 'voice', 'rating', 'date')),
  label jsonb not null default '{}',
  placeholder jsonb,
  help_text jsonb,
  options jsonb,
  validation jsonb,
  order_index integer not null default 0,
  is_required boolean default false not null,
  conditional_logic jsonb
);

create index idx_questions_section_id on anforderungsportal.template_questions(section_id);

alter table anforderungsportal.template_questions enable row level security;

-- ============================================
-- RESPONSES
-- ============================================
create table anforderungsportal.responses (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references anforderungsportal.projects(id) on delete cascade not null,
  respondent_id uuid,
  respondent_email text not null,
  template_id uuid references anforderungsportal.requirement_templates(id) on delete set null,
  status text default 'draft' not null check (status in ('draft', 'in_progress', 'submitted', 'reviewed')),
  progress_percent integer default 0 not null,
  submitted_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_responses_project_id on anforderungsportal.responses(project_id);
create index idx_responses_respondent_id on anforderungsportal.responses(respondent_id);
create index idx_responses_status on anforderungsportal.responses(status);

alter table anforderungsportal.responses enable row level security;

-- ============================================
-- RESPONSE ANSWERS
-- ============================================
create table anforderungsportal.response_answers (
  id uuid primary key default uuid_generate_v4(),
  response_id uuid references anforderungsportal.responses(id) on delete cascade not null,
  question_id uuid references anforderungsportal.template_questions(id) on delete cascade not null,
  value jsonb,
  voice_transcript text,
  ai_clarification text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(response_id, question_id)
);

create index idx_answers_response_id on anforderungsportal.response_answers(response_id);

alter table anforderungsportal.response_answers enable row level security;

-- ============================================
-- MAGIC LINKS
-- ============================================
create table anforderungsportal.magic_links (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references anforderungsportal.projects(id) on delete cascade not null,
  email text not null,
  token_hash text unique not null,
  role text default 'client' not null check (role in ('super_admin', 'product_owner', 'client')),
  status text default 'sent' not null check (status in ('sent', 'opened', 'in_progress', 'submitted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_magic_links_token_hash on anforderungsportal.magic_links(token_hash);
create index idx_magic_links_project_id on anforderungsportal.magic_links(project_id);
create index idx_magic_links_email on anforderungsportal.magic_links(email);

alter table anforderungsportal.magic_links enable row level security;

-- ============================================
-- AI CONVERSATIONS
-- ============================================
create table anforderungsportal.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  response_id uuid references anforderungsportal.responses(id) on delete cascade not null,
  messages jsonb default '[]' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_ai_conversations_response_id on anforderungsportal.ai_conversations(response_id);

alter table anforderungsportal.ai_conversations enable row level security;

-- ============================================
-- AUDIT LOG
-- ============================================
create table anforderungsportal.audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create index idx_audit_log_user_id on anforderungsportal.audit_log(user_id);
create index idx_audit_log_entity on anforderungsportal.audit_log(entity_type, entity_id);
create index idx_audit_log_created_at on anforderungsportal.audit_log(created_at);

alter table anforderungsportal.audit_log enable row level security;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Helper: get user's org_id from app_metadata
create or replace function anforderungsportal.get_user_org_id()
returns uuid
language sql
stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid;
$$;

-- Helper: get user's role from app_metadata
create or replace function anforderungsportal.get_user_role()
returns text
language sql
stable
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- Organizations: only members of the org can view
create policy "org_select" on anforderungsportal.organizations
  for select using (
    id = (select anforderungsportal.get_user_org_id())
    or (select anforderungsportal.get_user_role()) = 'super_admin'
  );

create policy "org_manage" on anforderungsportal.organizations
  for all using (
    (select anforderungsportal.get_user_role()) = 'super_admin'
  );

-- Projects: members can view, staff can modify
create policy "project_select" on anforderungsportal.projects
  for select using (
    org_id = (select anforderungsportal.get_user_org_id())
    or exists (
      select 1 from anforderungsportal.project_members pm
      where pm.project_id = projects.id
        and pm.user_id = (select auth.uid())
    )
  );

create policy "project_manage" on anforderungsportal.projects
  for all using (
    org_id = (select anforderungsportal.get_user_org_id())
    and (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

-- Project Members: visible to project participants
create policy "members_select" on anforderungsportal.project_members
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1 from anforderungsportal.projects p
      where p.id = project_members.project_id
        and p.org_id = (select anforderungsportal.get_user_org_id())
    )
  );

create policy "members_manage" on anforderungsportal.project_members
  for all using (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

-- Templates: org members can view, staff can modify
create policy "templates_select" on anforderungsportal.requirement_templates
  for select using (
    org_id is null  -- system defaults visible to all
    or org_id = (select anforderungsportal.get_user_org_id())
  );

create policy "templates_manage" on anforderungsportal.requirement_templates
  for all using (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

-- Sections: inherit from template
create policy "sections_select" on anforderungsportal.template_sections
  for select using (
    exists (
      select 1 from anforderungsportal.requirement_templates t
      where t.id = template_sections.template_id
        and (t.org_id is null or t.org_id = (select anforderungsportal.get_user_org_id()))
    )
  );

create policy "sections_manage" on anforderungsportal.template_sections
  for all using (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

-- Questions: inherit from section → template
create policy "questions_select" on anforderungsportal.template_questions
  for select using (
    exists (
      select 1 from anforderungsportal.template_sections s
      join anforderungsportal.requirement_templates t on t.id = s.template_id
      where s.id = template_questions.section_id
        and (t.org_id is null or t.org_id = (select anforderungsportal.get_user_org_id()))
    )
  );

create policy "questions_manage" on anforderungsportal.template_questions
  for all using (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

-- Responses: product_owners see own, staff see all in org
create policy "responses_select" on anforderungsportal.responses
  for select using (
    respondent_id = (select auth.uid())
    or exists (
      select 1 from anforderungsportal.projects p
      where p.id = responses.project_id
        and p.org_id = (select anforderungsportal.get_user_org_id())
    )
  );

create policy "responses_insert" on anforderungsportal.responses
  for insert with check (
    respondent_id = (select auth.uid())
    or (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

create policy "responses_update" on anforderungsportal.responses
  for update using (
    respondent_id = (select auth.uid())
    or (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

-- Response Answers
create policy "answers_select" on anforderungsportal.response_answers
  for select using (
    exists (
      select 1 from anforderungsportal.responses r
      where r.id = response_answers.response_id
        and (
          r.respondent_id = (select auth.uid())
          or exists (
            select 1 from anforderungsportal.projects p
            where p.id = r.project_id
              and p.org_id = (select anforderungsportal.get_user_org_id())
          )
        )
    )
  );

create policy "answers_upsert" on anforderungsportal.response_answers
  for all using (
    exists (
      select 1 from anforderungsportal.responses r
      where r.id = response_answers.response_id
        and (
          r.respondent_id = (select auth.uid())
          or (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
        )
    )
  );

-- Magic Links: staff manage, token lookup for anonymous
create policy "magic_links_manage" on anforderungsportal.magic_links
  for all using (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

-- AI Conversations: linked to response access
create policy "ai_conv_access" on anforderungsportal.ai_conversations
  for all using (
    exists (
      select 1 from anforderungsportal.responses r
      where r.id = ai_conversations.response_id
        and (
          r.respondent_id = (select auth.uid())
          or exists (
            select 1 from anforderungsportal.projects p
            where p.id = r.project_id
              and p.org_id = (select anforderungsportal.get_user_org_id())
          )
        )
    )
  );

-- Audit Log: staff can view
create policy "audit_log_select" on anforderungsportal.audit_log
  for select using (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

create policy "audit_log_insert" on anforderungsportal.audit_log
  for insert with check (true);  -- any authenticated user can create log entries

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on anforderungsportal.projects
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on anforderungsportal.requirement_templates
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on anforderungsportal.responses
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on anforderungsportal.response_answers
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on anforderungsportal.ai_conversations
  for each row execute function public.handle_updated_at();
