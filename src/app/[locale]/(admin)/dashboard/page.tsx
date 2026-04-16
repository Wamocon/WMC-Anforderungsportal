'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Hourglass,
  TrendingUp,
  AlertCircle,
  Activity,
  BarChart3,
  CheckCircle2,
  XCircle,
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

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  requirement_type: string[];
  created_at: string;
};

export default function DashboardPage() {
  const t = useTranslations('admin');
  const tResponse = useTranslations('response');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [pendingReview, setPendingReview] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [recentResponses, setRecentResponses] = useState<ResponseRow[]>([]);

  const totalProjects = projects.length;
  const activeProjects = useMemo(() => projects.filter((p) => p.status === 'active').length, [projects]);
  const pendingProposals = useMemo(() => projects.filter((p) => p.status === 'pending_review').length, [projects]);
  const draftProjects = useMemo(() => projects.filter((p) => p.status === 'draft').length, [projects]);
  const approvedProjects = useMemo(() => projects.filter((p) => p.status === 'approved').length, [projects]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        await supabase.auth.refreshSession();

        const [projectsRes, responsesRes] = await Promise.all([
          supabase.from('projects').select('id, name, status, requirement_type, created_at'),
          supabase.from('responses').select('id, status, project_id, respondent_name, respondent_email, submitted_at, updated_at'),
        ]);

        const proj = (projectsRes.data ?? []) as ProjectRow[];
        const responses = (responsesRes.data ?? []) as ResponseRow[];

        setProjects(proj);
        setTotalResponses(responses.length);
        setPendingReview(responses.filter((r) => r.status === 'submitted').length);

        const completedCount = responses.filter((r) => r.status === 'submitted' || r.status === 'reviewed').length;
        setCompletionRate(responses.length > 0 ? Math.round((completedCount / responses.length) * 100) : 0);

        setRecentResponses(
          responses
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            .slice(0, 5)
        );
      } catch (err) {
        console.error('Dashboard load error:', err);
        setLoadError(t('failedLoadDashboard'));
      } finally {
        setLoading(false);
      }
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
        {/* Hero stat skeleton */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="border-0 shadow-md"><CardContent className="p-5"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
        {/* Secondary stats skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {[1,2,3].map(i => (<Card key={i} className="border-0 shadow-md"><CardContent className="p-5"><Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-6 w-12" /></CardContent></Card>))}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3 border-0 shadow-md"><CardContent className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</CardContent></Card>
          <Card className="lg:col-span-2 border-0 shadow-md"><CardContent className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</CardContent></Card>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-8">
        <Card className="border-destructive/30 bg-destructive/5 shadow-md">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">{loadError}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('tryRefreshPage')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Primary KPI cards
  const primaryStats = [
    {
      title: t('totalProjects'),
      value: totalProjects,
      icon: FolderKanban,
      color: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/10',
      accent: 'from-blue-500/20 via-blue-500/5 to-transparent',
    },
    {
      title: t('activeProjects'),
      value: activeProjects,
      icon: Activity,
      color: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      accent: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
    },
    {
      title: t('totalResponses'),
      value: totalResponses,
      icon: MessageSquareText,
      color: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-500/10',
      accent: 'from-purple-500/20 via-purple-500/5 to-transparent',
    },
    {
      title: t('completionRate'),
      value: completionRate,
      isPercent: true,
      icon: TrendingUp,
      color: 'text-teal-600 dark:text-teal-400',
      iconBg: 'bg-teal-500/10',
      accent: 'from-teal-500/20 via-teal-500/5 to-transparent',
    },
  ];

  // Secondary awareness cards
  const secondaryStats = [
    {
      title: t('pendingProposals'),
      value: pendingProposals,
      icon: Hourglass,
      color: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/10',
      href: '/projects',
      pulse: pendingProposals > 0,
    },
    {
      title: t('pendingReview'),
      value: pendingReview,
      icon: FileText,
      color: 'text-[#FE0404]',
      iconBg: 'bg-[#FE0404]/10',
      href: '/responses',
      pulse: pendingReview > 0,
    },
    {
      title: t('activeProjects'),
      value: `${draftProjects} / ${approvedProjects} / ${activeProjects}`,
      subtitle: 'Draft / Approved / Active',
      icon: BarChart3,
      color: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-500/10',
      href: '/projects',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="animate-page-enter flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('overview')}</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-[#FE0404] hover:bg-[#CC0000] text-white gap-2 shadow-lg shadow-[#FE0404]/20 hover:shadow-[#FE0404]/30 transition-all w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            {t('createProject')}
          </Button>
        </Link>
      </div>

      {/* Primary KPI Grid — 2×2 on mobile, 4 on desktop */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 perspective-container">
        {primaryStats.map((stat) => (
          <Card
            key={stat.title}
            className="group relative overflow-hidden border-0 shadow-md shadow-black/5 card-3d glass-v2 stagger-enter"
          >
            {/* Gradient accent bar at top */}
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accent}`} />
            <CardContent className="p-4 sm:p-6 pt-5 sm:pt-7">
              <div className="flex items-start justify-between">
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                    {stat.title}
                  </p>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight tabular-nums">
                    {stat.value}{stat.isPercent && <span className="text-lg sm:text-xl text-muted-foreground ml-0.5">%</span>}
                  </p>
                </div>
                <div className={`rounded-xl ${stat.iconBg} p-2 sm:p-2.5 group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                  <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                </div>
              </div>
              {/* Mini progress bar for completion rate */}
              {stat.isPercent && (
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 animate-progress"
                    style={{ width: `${stat.value}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary awareness strip */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        {secondaryStats.map((stat) => {
          const Inner = (
            <Card
              key={stat.title}
              className={`group border-0 shadow-sm shadow-black/5 glass-v2 hover:shadow-md transition-all duration-300 ${stat.pulse ? 'ring-1 ring-amber-300/50 dark:ring-amber-500/30' : ''}`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`rounded-lg ${stat.iconBg} p-2 shrink-0 relative`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  {stat.pulse && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-lg font-bold tracking-tight tabular-nums">{stat.value}</p>
                  {stat.subtitle && <p className="text-[10px] text-muted-foreground/70">{stat.subtitle}</p>}
                </div>
                {stat.href && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                )}
              </CardContent>
            </Card>
          );
          return stat.href ? <Link key={stat.title} href={stat.href}>{Inner}</Link> : <div key={stat.title}>{Inner}</div>;
        })}
      </div>

      {/* Recent Activity + Quick Actions — better responsive split */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
        {/* Recent Activity — wider */}
        <Card className="lg:col-span-3 border-0 shadow-md shadow-black/5 glass-v2 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 p-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              {t('recentActivity')}
              {recentResponses.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-[10px] px-2 py-0.5">
                  {recentResponses.length} latest
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentResponses.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquareText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{t('noResponsesYet')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentResponses.map((r, idx) => (
                  <Link key={r.id} href={`/responses/${r.id}`}>
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-xl border border-border/50 p-3 hover:bg-accent/40 hover:border-border transition-all duration-200 cursor-pointer stagger-enter`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#FE0404]/20 to-[#FE0404]/5 text-[#FE0404] font-semibold text-sm shrink-0 ring-1 ring-[#FE0404]/10">
                          {(r.respondent_name || r.respondent_email)?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{r.respondent_name || r.respondent_email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.updated_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={`${statusConfig[r.status]?.color ?? ''} self-start sm:self-center shrink-0 text-[11px]`}>
                        {tResponse(`status.${r.status}`, { defaultValue: statusConfig[r.status]?.label ?? r.status })}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions — narrower, right column */}
        <Card className="lg:col-span-2 border-0 shadow-md shadow-black/5 glass-v2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg">{t('quickActions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {([
              { href: '/projects/new', icon: Plus, iconColor: 'text-[#FE0404]', iconBg: 'bg-[#FE0404]/10', label: t('createProject'), desc: t('createProjectDesc') },
              { href: '/templates',    icon: FileText, iconColor: 'text-purple-600', iconBg: 'bg-purple-50 dark:bg-purple-900/20', label: t('manageTemplates'), desc: t('manageTemplatesActionDesc') },
              { href: '/responses',    icon: ArrowRight, iconColor: 'text-green-600', iconBg: 'bg-green-50 dark:bg-green-900/20',  label: t('viewResponses'), desc: t('viewResponsesDesc') },
            ] as const).map((action) => (
              <Link key={action.href} href={action.href}>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 sm:py-4 hover:border-[#FE0404]/30 hover:bg-[#FE0404]/5 transition-all duration-200 group/btn"
                >
                  <div className={`rounded-lg ${action.iconBg} p-2 group-hover/btn:scale-110 transition-transform`}>
                    <action.icon className={`h-4 w-4 ${action.iconColor}`} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-medium text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{action.desc}</p>
                  </div>
                </Button>
              </Link>
            ))}

            {pendingProposals > 0 && (
              <Link href="/projects">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-auto py-3 sm:py-4 border-amber-200 dark:border-amber-800/50 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all group/btn"
                >
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2 relative group-hover/btn:scale-110 transition-transform">
                    <Hourglass className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      {pendingProposals}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{t('pendingProposals')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('reviewProposalsDesc')}</p>
                  </div>
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Status Distribution — visual bar */}
      {totalProjects > 0 && (
        <Card className="border-0 shadow-md shadow-black/5 glass-v2 stagger-enter">
          <CardContent className="p-4 sm:p-6">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-3">{t('projects')} — Status</p>
            <div className="flex rounded-full h-3 overflow-hidden bg-muted gap-0.5">
              {activeProjects > 0 && <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(activeProjects / totalProjects) * 100}%` }} title={`Active: ${activeProjects}`} />}
              {approvedProjects > 0 && <div className="bg-teal-400 transition-all duration-700" style={{ width: `${(approvedProjects / totalProjects) * 100}%` }} title={`Approved: ${approvedProjects}`} />}
              {pendingProposals > 0 && <div className="bg-amber-400 transition-all duration-700" style={{ width: `${(pendingProposals / totalProjects) * 100}%` }} title={`Pending: ${pendingProposals}`} />}
              {draftProjects > 0 && <div className="bg-slate-300 dark:bg-slate-600 transition-all duration-700" style={{ width: `${(draftProjects / totalProjects) * 100}%` }} title={`Draft: ${draftProjects}`} />}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Active ({activeProjects})</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-400" /> Approved ({approvedProjects})</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Pending ({pendingProposals})</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Draft ({draftProjects})</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
