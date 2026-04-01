'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import {
  FolderKanban,
  FileText,
  MessageSquareText,
  Clock,
  Plus,
  ArrowRight,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ResponseRow = {
  id: string;
  status: string;
  project_id: string;
  respondent_name: string | null;
  respondent_email: string;
  submitted_at: string | null;
  updated_at: string;
};

export default function DashboardPage() {
  const t = useTranslations('admin');
  const tResponse = useTranslations('response');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [totalResponses, setTotalResponses] = useState(0);
  const [pendingReview, setPendingReview] = useState(0);
  const [recentResponses, setRecentResponses] = useState<ResponseRow[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      await supabase.auth.refreshSession();

      const [projectsRes, responsesRes] = await Promise.all([
        supabase.from('projects').select('id, status'),
        supabase.from('responses').select('id, status, project_id, respondent_name, respondent_email, submitted_at, updated_at'),
      ]);

      const projects = projectsRes.data ?? [];
      const responses = (responsesRes.data ?? []) as ResponseRow[];

      setTotalProjects(projects.length);
      setActiveProjects(projects.filter((p) => p.status === 'active').length);
      setTotalResponses(responses.length);
      setPendingReview(responses.filter((r) => r.status === 'submitted').length);

      setRecentResponses(
        responses
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 5)
      );
      setLoading(false);
    }
    load();
  }, []);

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft:       { label: 'Draft',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    submitted:   { label: 'Submitted',   color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    reviewed:    { label: 'Reviewed',    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2"><Skeleton className="h-9 w-48" /><Skeleton className="h-4 w-64" /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></div>
                <Skeleton className="h-12 w-12 rounded-2xl" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-0 shadow-md"><CardContent className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</CardContent></Card>
          <Card className="border-0 shadow-md"><CardContent className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</CardContent></Card>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: t('totalProjects'),
      value: String(totalProjects),
      icon: FolderKanban,
      color: 'text-blue-600',
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50',
      ring: 'ring-blue-200/50',
    },
    {
      title: t('activeProjects'),
      value: String(activeProjects),
      icon: Clock,
      color: 'text-emerald-600',
      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
      ring: 'ring-emerald-200/50',
    },
    {
      title: t('totalResponses'),
      value: String(totalResponses),
      icon: MessageSquareText,
      color: 'text-purple-600',
      bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50',
      ring: 'ring-purple-200/50',
    },
    {
      title: t('pendingReview'),
      value: String(pendingReview),
      icon: FileText,
      color: 'text-[#FE0404]',
      bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
      ring: 'ring-red-200/50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="animate-page-enter">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard')}</h1>
        <p className="text-muted-foreground mt-1">{t('overview')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 perspective-container">
        {stats.map((stat, i) => (
          <Card key={stat.title} className={`group border-0 shadow-md shadow-black/5 card-3d spotlight-card glass-v2 ring-1 ${stat.ring} stagger-enter`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight animate-count">{stat.value}</p>
                </div>
                <div className={`rounded-2xl ${stat.bg} p-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 border-0 shadow-md shadow-black/5 glass-v2 spotlight-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 p-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              {t('recentActivity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentResponses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquareText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t('noResponsesYet')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentResponses.map((r) => (
                  <Link key={r.id} href={`/responses/${r.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-lg border p-3 hover:bg-accent/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FE0404]/10 text-[#FE0404] font-semibold text-sm shrink-0">
                          {(r.respondent_name || r.respondent_email)?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{r.respondent_name || r.respondent_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.updated_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`${statusConfig[r.status]?.color ?? ''} self-start sm:self-center shrink-0`}>
                        {tResponse(`status.${r.status}`, { defaultValue: statusConfig[r.status]?.label ?? r.status })}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-md shadow-black/5 glass-v2 spotlight-card">
          <CardHeader>
            <CardTitle className="text-lg">{t('quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/projects/new">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4 hover:border-[#FE0404]/30 hover:bg-[#FE0404]/5"
              >
                <div className="rounded-lg bg-[#FE0404]/10 p-2">
                  <Plus className="h-4 w-4 text-[#FE0404]" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{t('createProject')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('createProjectDesc')}
                  </p>
                </div>
              </Button>
            </Link>

            <Link href="/templates">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4 hover:border-[#FE0404]/30 hover:bg-[#FE0404]/5"
              >
                <div className="rounded-lg bg-purple-50 p-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{t('manageTemplates')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('manageTemplatesActionDesc')}
                  </p>
                </div>
              </Button>
            </Link>

            <Link href="/responses">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4 hover:border-[#FE0404]/30 hover:bg-[#FE0404]/5"
              >
                <div className="rounded-lg bg-green-50 p-2">
                  <ArrowRight className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">{t('viewResponses')}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('viewResponsesDesc')}
                  </p>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
