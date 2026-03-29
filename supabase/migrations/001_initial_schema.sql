-- WMC Anforderungsportal - Initial Schema
-- Multi-tenant requirement collection platform

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- ORGANIZATIONS
-- ============================================
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  logo_url text,
  created_at timestamptz default now() not null
);

alter table public.organizations enable row level security;

-- ============================================
-- PROJECTS
-- ============================================
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references public.organizations(id) on delete cascade not null,
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

create index idx_projects_org_id on public.projects(org_id);
create index idx_projects_status on public.projects(status);

alter table public.projects enable row level security;

-- ============================================
-- PROJECT MEMBERS
-- ============================================
create table public.project_members (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid not null,
  role text default 'client' not null check (role in ('super_admin', 'product_owner', 'client')),
  created_at timestamptz default now() not null,
  unique(project_id, user_id)
);

create index idx_project_members_user_id on public.project_members(user_id);
create index idx_project_members_project_id on public.project_members(project_id);

alter table public.project_members enable row level security;

-- ============================================
-- REQUIREMENT TEMPLATES
-- ============================================
create table public.requirement_templates (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_default boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_templates_org_id on public.requirement_templates(org_id);

alter table public.requirement_templates enable row level security;

-- Add the FK now that templates table exists
alter table public.projects
  add constraint fk_projects_template
  foreign key (template_id) references public.requirement_templates(id) on delete set null;

-- ============================================
-- TEMPLATE SECTIONS
-- ============================================
create table public.template_sections (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references public.requirement_templates(id) on delete cascade not null,
  title jsonb not null default '{}',
  description jsonb,
  order_index integer not null default 0,
  is_required boolean default true not null
);

create index idx_sections_template_id on public.template_sections(template_id);

alter table public.template_sections enable row level security;

-- ============================================
-- TEMPLATE QUESTIONS
-- ============================================
create table public.template_questions (
  id uuid primary key default uuid_generate_v4(),
  section_id uuid references public.template_sections(id) on delete cascade not null,
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

create index idx_questions_section_id on public.template_questions(section_id);

alter table public.template_questions enable row level security;

-- ============================================
-- RESPONSES
-- ============================================
create table public.responses (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  respondent_id uuid,
  respondent_email text not null,
  template_id uuid references public.requirement_templates(id) on delete set null,
  status text default 'draft' not null check (status in ('draft', 'in_progress', 'submitted', 'reviewed')),
  progress_percent integer default 0 not null,
  submitted_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_responses_project_id on public.responses(project_id);
create index idx_responses_respondent_id on public.responses(respondent_id);
create index idx_responses_status on public.responses(status);

alter table public.responses enable row level security;

-- ============================================
-- RESPONSE ANSWERS
-- ============================================
create table public.response_answers (
  id uuid primary key default uuid_generate_v4(),
  response_id uuid references public.responses(id) on delete cascade not null,
  question_id uuid references public.template_questions(id) on delete cascade not null,
  value jsonb,
  voice_transcript text,
  ai_clarification text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(response_id, question_id)
);

create index idx_answers_response_id on public.response_answers(response_id);

alter table public.response_answers enable row level security;

-- ============================================
-- MAGIC LINKS
-- ============================================
create table public.magic_links (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  email text not null,
  token_hash text unique not null,
  role text default 'client' not null check (role in ('super_admin', 'product_owner', 'client')),
  status text default 'sent' not null check (status in ('sent', 'opened', 'in_progress', 'submitted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_magic_links_token_hash on public.magic_links(token_hash);
create index idx_magic_links_project_id on public.magic_links(project_id);
create index idx_magic_links_email on public.magic_links(email);

alter table public.magic_links enable row level security;

-- ============================================
-- AI CONVERSATIONS
-- ============================================
create table public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  response_id uuid references public.responses(id) on delete cascade not null,
  messages jsonb default '[]' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_ai_conversations_response_id on public.ai_conversations(response_id);

alter table public.ai_conversations enable row level security;

-- ============================================
-- AUDIT LOG
-- ============================================
create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now() not null
);

create index idx_audit_log_user_id on public.audit_log(user_id);
create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_created_at on public.audit_log(created_at);

alter table public.audit_log enable row level security;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Helper: get user's org_id from app_metadata
create or replace function public.get_user_org_id()
returns uuid
language sql
stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid;
$$;

-- Helper: get user's role from app_metadata
create or replace function public.get_user_role()
returns text
language sql
stable
as $$
  select auth.jwt() -> 'app_metadata' ->> 'role';
$$;

-- Organizations: only members of the org can view
create policy "org_select" on public.organizations
  for select using (
    id = (select public.get_user_org_id())
    or (select public.get_user_role()) = 'super_admin'
  );

create policy "org_manage" on public.organizations
  for all using (
    (select public.get_user_role()) = 'super_admin'
  );

-- Projects: members can view, product_owners can modify
create policy "project_select" on public.projects
  for select using (
    org_id = (select public.get_user_org_id())
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id
        and pm.user_id = (select auth.uid())
    )
  );

create policy "project_manage" on public.projects
  for all using (
    org_id = (select public.get_user_org_id())
    and (select public.get_user_role()) in ('super_admin', 'product_owner')
  );

-- Project Members: visible to project participants
create policy "members_select" on public.project_members
  for select using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = project_members.project_id
        and p.org_id = (select public.get_user_org_id())
    )
  );

create policy "members_manage" on public.project_members
  for all using (
    (select public.get_user_role()) in ('super_admin', 'product_owner')
  );

-- Templates: org members can view, product_owners can modify
create policy "templates_select" on public.requirement_templates
  for select using (
    org_id is null  -- system defaults visible to all
    or org_id = (select public.get_user_org_id())
  );

create policy "templates_manage" on public.requirement_templates
  for all using (
    (select public.get_user_role()) in ('super_admin', 'product_owner')
  );

-- Sections: inherit from template
create policy "sections_select" on public.template_sections
  for select using (
    exists (
      select 1 from public.requirement_templates t
      where t.id = template_sections.template_id
        and (t.org_id is null or t.org_id = (select public.get_user_org_id()))
    )
  );

create policy "sections_manage" on public.template_sections
  for all using (
    (select public.get_user_role()) in ('super_admin', 'product_owner')
  );

-- Questions: inherit from section → template
create policy "questions_select" on public.template_questions
  for select using (
    exists (
      select 1 from public.template_sections s
      join public.requirement_templates t on t.id = s.template_id
      where s.id = template_questions.section_id
        and (t.org_id is null or t.org_id = (select public.get_user_org_id()))
    )
  );

create policy "questions_manage" on public.template_questions
  for all using (
    (select public.get_user_role()) in ('super_admin', 'product_owner')
  );

-- Responses: clients see own, product_owners see all in org
create policy "responses_select" on public.responses
  for select using (
    respondent_id = (select auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = responses.project_id
        and p.org_id = (select public.get_user_org_id())
    )
  );

create policy "responses_insert" on public.responses
  for insert with check (
    respondent_id = (select auth.uid())
    or (select public.get_user_role()) in ('super_admin', 'product_owner')
  );

create policy "responses_update" on public.responses
  for update using (
    respondent_id = (select auth.uid())
    or (select public.get_user_role()) in ('super_admin', 'product_owner')
  );

-- Response Answers
create policy "answers_select" on public.response_answers
  for select using (
    exists (
      select 1 from public.responses r
      where r.id = response_answers.response_id
        and (
          r.respondent_id = (select auth.uid())
          or exists (
            select 1 from public.projects p
            where p.id = r.project_id
              and p.org_id = (select public.get_user_org_id())
          )
        )
    )
  );

create policy "answers_upsert" on public.response_answers
  for all using (
    exists (
      select 1 from public.responses r
      where r.id = response_answers.response_id
        and (
          r.respondent_id = (select auth.uid())
          or (select public.get_user_role()) in ('super_admin', 'product_owner')
        )
    )
  );

-- Magic Links: product_owners manage, token lookup for anonymous
create policy "magic_links_manage" on public.magic_links
  for all using (
    (select public.get_user_role()) in ('super_admin', 'product_owner')
  );

-- AI Conversations: linked to response access
create policy "ai_conv_access" on public.ai_conversations
  for all using (
    exists (
      select 1 from public.responses r
      where r.id = ai_conversations.response_id
        and (
          r.respondent_id = (select auth.uid())
          or exists (
            select 1 from public.projects p
            where p.id = r.project_id
              and p.org_id = (select public.get_user_org_id())
          )
        )
    )
  );

-- Audit Log: product_owners can view
create policy "audit_log_select" on public.audit_log
  for select using (
    (select public.get_user_role()) in ('super_admin', 'product_owner')
  );

create policy "audit_log_insert" on public.audit_log
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

create trigger set_updated_at before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.requirement_templates
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.responses
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.response_answers
  for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.ai_conversations
  for each row execute function public.handle_updated_at();
