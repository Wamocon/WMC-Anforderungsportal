'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  ArrowRight,
  Clock,
  CheckCircle,
  FileEdit,
  Loader2,
  Inbox,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ClientProject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  deadline_days: number;
  created_at: string;
  response_status: string | null;
  response_progress: number | null;
  response_id: string | null;
};

export default function MyProjectsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Display name: prefer full_name, then format email prefix nicely
      const fullName = user.user_metadata?.full_name;
      if (fullName) {
        setUserName(fullName);
      } else {
        const prefix = user.email?.split('@')[0] || '';
        setUserName(
          prefix
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        );
      }

      // Get projects where this user has a response, a magic link, or a membership
      const [{ data: responses }, { data: magicLinks }, { data: memberships }] = await Promise.all([
        supabase
          .from('responses')
          .select('id, project_id, status, progress_percent')
          .or(`respondent_id.eq.${user.id},respondent_email.eq.${user.email}`),
        supabase
          .from('magic_links')
          .select('project_id')
          .eq('email', user.email!),
        supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id),
      ]);

      // Collect unique project IDs
      const projectIds = new Set<string>();
      responses?.forEach(r => projectIds.add(r.project_id));
      magicLinks?.forEach(ml => projectIds.add(ml.project_id));
      memberships?.forEach(m => projectIds.add(m.project_id));

      if (projectIds.size === 0) {
        setLoading(false);
        return;
      }

      // Fetch project details
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name, slug, description, status, deadline_days, created_at')
        .in('id', Array.from(projectIds))
        .eq('status', 'active');

      const merged: ClientProject[] = (projectData ?? []).map(p => {
        const resp = responses?.find(r => r.project_id === p.id);
        return {
          ...p,
          response_status: resp?.status ?? null,
          response_progress: resp?.progress_percent ?? null,
          response_id: resp?.id ?? null,
        };
      });

      setProjects(merged);
      setLoading(false);
    }
    load();
  }, []);

  const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    draft: { icon: FileEdit, color: 'text-gray-600', bg: 'bg-muted' },
    in_progress: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
    submitted: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    reviewed: { icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-100' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('client.welcome', { name: userName })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('client.myProjectsDescription')}
        </p>
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <Card className="border-0 shadow-md bg-card/80 backdrop-blur-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">{t('client.noProjects')}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {t('client.noProjectsDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const resp = project.response_status;
            const cfg = statusConfig[resp ?? 'draft'] ?? statusConfig.draft;
            const StatusIcon = cfg.icon;
            const isSubmitted = resp === 'submitted' || resp === 'reviewed';

            return (
              <Card
                key={project.id}
                className="border-0 shadow-md shadow-black/5 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all duration-200"
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                      <div className="rounded-xl bg-gradient-to-br from-[#FE0404]/10 to-[#FE0404]/5 p-2.5 sm:p-3 shrink-0">
                        <FolderKanban className="h-5 w-5 sm:h-6 sm:w-6 text-[#FE0404]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-0 gap-1`}>
                            <StatusIcon className="h-3 w-3" />
                            {resp ? t(`response.status.${resp}`) : t('client.notStarted')}
                          </Badge>
                          {project.response_progress !== null && project.response_progress > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {project.response_progress}% {t('common.progress').toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center w-full sm:w-auto">
                      {isSubmitted ? (
                        <Button variant="outline" size="sm" disabled className="gap-1 w-full sm:w-auto">
                          <CheckCircle className="h-4 w-4" />
                          {t('client.submitted')}
                        </Button>
                      ) : (
                        <a href={`/${locale}/form/${project.slug}${resp === 'in_progress' || resp === 'draft' ? '/fill' : ''}`}>
                          <Button
                            size="sm"
                            className="gap-1 bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white shadow-sm w-full sm:w-auto"
                          >
                            {resp === 'in_progress' || resp === 'draft'
                              ? t('form.continueForm')
                              : t('form.startForm')}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {project.response_progress !== null && project.response_progress > 0 && !isSubmitted && (
                    <div className="mt-4">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FE0404] to-[#D00303] rounded-full transition-all duration-500"
                          style={{ width: `${project.response_progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
