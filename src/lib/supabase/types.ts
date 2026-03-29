export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multi_select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'voice'
  | 'rating'
  | 'date';

export type ProjectStatus = 'draft' | 'active' | 'archived';
export type ResponseStatus = 'draft' | 'in_progress' | 'submitted' | 'reviewed';
export type MemberRole = 'super_admin' | 'product_owner' | 'client';
export type InvitationStatus = 'sent' | 'opened' | 'in_progress' | 'submitted' | 'expired' | 'revoked';

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
}

export type Project = {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  welcome_text: Json; // { en: "...", de: "...", tr: "..." }
  deadline_days: number;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export type RequirementTemplate = {
  id: string;
  org_id: string | null;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type TemplateSection = {
  id: string;
  template_id: string;
  title: Json; // multilingual
  description: Json | null;
  order_index: number;
  is_required: boolean;
}

export type TemplateQuestion = {
  id: string;
  section_id: string;
  type: QuestionType;
  label: Json; // multilingual { en: "...", de: "..." }
  placeholder: Json | null;
  help_text: Json | null;
  options: Json | null; // for select/radio/checkbox: [{ value, label: { en, de } }]
  validation: Json | null; // { min, max, pattern, etc. }
  order_index: number;
  is_required: boolean;
  conditional_logic: Json | null; // { depends_on: questionId, show_when: value }
}

export type ProjectResponse = {
  id: string;
  project_id: string;
  respondent_id: string | null;
  respondent_email: string;
  respondent_name: string | null;
  template_id: string;
  status: ResponseStatus;
  progress_percent: number;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ResponseAnswer = {
  id: string;
  response_id: string;
  question_id: string;
  value: Json;
  voice_transcript: string | null;
  ai_clarification: string | null;
  created_at: string;
  updated_at: string;
}

export type MagicLink = {
  id: string;
  project_id: string;
  email: string;
  token_hash: string;
  role: MemberRole;
  status: InvitationStatus;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export type AiConversation = {
  id: string;
  response_id: string;
  messages: Json; // [{ role, content, timestamp }]
  created_at: string;
  updated_at: string;
}

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json | null;
  created_at: string;
}

// Helper types for multilingual content
export type MultilingualText = Record<string, string>;

// Database types compatible with @supabase/supabase-js v2
// Schema key must match the db.schema option passed to the client
export type Database = {
  anforderungen: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          logo_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          logo_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          slug: string;
          description?: string | null;
          status?: ProjectStatus;
          welcome_text?: Json;
          deadline_days?: number;
          template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          status?: ProjectStatus;
          welcome_text?: Json;
          deadline_days?: number;
          template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: ProjectMember;
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
        };
        Relationships: [];
      };
      requirement_templates: {
        Row: RequirementTemplate;
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          description?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      template_sections: {
        Row: TemplateSection;
        Insert: {
          id?: string;
          template_id: string;
          title: Json;
          description?: Json | null;
          order_index: number;
          is_required?: boolean;
        };
        Update: {
          id?: string;
          template_id?: string;
          title?: Json;
          description?: Json | null;
          order_index?: number;
          is_required?: boolean;
        };
        Relationships: [];
      };
      template_questions: {
        Row: TemplateQuestion;
        Insert: {
          id?: string;
          section_id: string;
          type: QuestionType;
          label: Json;
          placeholder?: Json | null;
          help_text?: Json | null;
          options?: Json | null;
          validation?: Json | null;
          order_index: number;
          is_required?: boolean;
          conditional_logic?: Json | null;
        };
        Update: {
          id?: string;
          section_id?: string;
          type?: QuestionType;
          label?: Json;
          placeholder?: Json | null;
          help_text?: Json | null;
          options?: Json | null;
          validation?: Json | null;
          order_index?: number;
          is_required?: boolean;
          conditional_logic?: Json | null;
        };
        Relationships: [];
      };
      responses: {
        Row: ProjectResponse;
        Insert: {
          id?: string;
          project_id: string;
          respondent_id?: string | null;
          respondent_email: string;
          respondent_name?: string | null;
          template_id: string;
          status?: ResponseStatus;
          progress_percent?: number;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          respondent_id?: string | null;
          respondent_email?: string;
          respondent_name?: string | null;
          template_id?: string;
          status?: ResponseStatus;
          progress_percent?: number;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      response_answers: {
        Row: ResponseAnswer;
        Insert: {
          id?: string;
          response_id: string;
          question_id: string;
          value: Json;
          voice_transcript?: string | null;
          ai_clarification?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          response_id?: string;
          question_id?: string;
          value?: Json;
          voice_transcript?: string | null;
          ai_clarification?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      magic_links: {
        Row: MagicLink;
        Insert: {
          id?: string;
          project_id: string;
          email: string;
          token_hash: string;
          role?: MemberRole;
          status?: InvitationStatus;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          email?: string;
          token_hash?: string;
          role?: MemberRole;
          status?: InvitationStatus;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: AiConversation;
        Insert: {
          id?: string;
          response_id: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          response_id?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: AuditLog;
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_status: ProjectStatus;
      response_status: ResponseStatus;
      member_role: MemberRole;
      invitation_status: InvitationStatus;
      question_type: QuestionType;
    };
    CompositeTypes: Record<string, never>;
  };
};
