'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import {
  FolderKanban,
  Search,
  X,
  ExternalLink,
  Clock,
  Users,
  MessageSquare,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Globe,
  Shield,
  Layers,
  ArrowRight,
  Calendar,
  Activity,
  Link2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { statusKey } from '@/lib/utils';

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  requirement_type: string[];
  onedrive_link: string | null;
  created_at: string;
  updated_at: string;
};

type ProjectMember = {
  project_id: string;
  role: string;
  email: string;
  full_name: string;
};

const statusConfig: Record<string, { bar: string; badge: string; dot: string }> = {
  active:         { bar: 'from-emerald-500 to-emerald-400', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', dot: 'bg-emerald-500' },
  draft:          { bar: 'from-slate-400 to-slate-300',     badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', dot: 'bg-slate-400' },
  archived:       { bar: 'from-orange-400 to-orange-300',   badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-400' },
  pending_review: { bar: 'from-amber-500 to-amber-400',     badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  approved:       { bar: 'from-teal-500 to-teal-400',       badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400', dot: 'bg-teal-500' },
};

const roleLabels: Record<string, { label: string; color: string }> = {
  product_owner: { label: 'Product Owner', color: 'text-blue-600 dark:text-blue-400' },
  staff:         { label: 'Staff',         color: 'text-emerald-600 dark:text-emerald-400' },
  super_admin:   { label: 'Super Admin',   color: 'text-purple-600 dark:text-purple-400' },
  client:        { label: 'Client',        color: 'text-amber-600 dark:text-amber-400' },
};

function relativeTime(dateStr: string, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' });
    if (secs < 60) return rtf.format(-secs, 'second');
    const mins = Math.floor(secs / 60);
    if (mins < 60) return rtf.format(-mins, 'minute');
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return rtf.format(-hrs, 'hour');
    const days = Math.floor(hrs / 24);
    if (days < 30) return rtf.format(-days, 'day');
  } catch { /* fallback */ }
  return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

export default function PortfolioPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [membersByProject, setMembersByProject] = useState<Record<string, ProjectMember[]>>({});
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      await supabase.auth.refreshSession();

      const [{ data: projData }, { data: respData }] = await Promise.all([
        supabase.from('projects').select('*').order('updated_at', { ascending: false }),
        supabase.from('responses').select('project_id'),
      ]);

      let membersData: ProjectMember[] = [];
      try {
        const { data } = await supabase.rpc('get_project_members_info');
        if (data) membersData = data as ProjectMember[];
      } catch { /* ignored */ }

      let attCounts: Record<string, number> = {};
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: attData } = await (supabase as any).from('project_attachments').select('project_id');
        attCounts = ((attData ?? []) as { project_id: string }[]).reduce<Record<string, number>>((acc, r) => {
          acc[r.project_id] = (acc[r.project_id] || 0) + 1;
          return acc;
        }, {});
      } catch { /* non-critical */ }

      setProjects((projData ?? []) as ProjectRow[]);
      setResponseCounts((respData ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.project_id] = (acc[r.project_id] || 0) + 1; return acc; }, {}));
      setMembersByProject(
        membersData.reduce<Record<string, ProjectMember[]>>((acc, m) => {
          if (!acc[m.project_id]) acc[m.project_id] = [];
          acc[m.project_id].push(m);
          return acc;
        }, {})
      );
      setAttachmentCounts(attCounts);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.trim().toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (membersByProject[p.id] ?? []).some(
          (m) => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
        )
    );
  }, [projects, searchQuery, membersByProject]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2"><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-72" /></div>
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden border-0 shadow-md">
              <div className="h-1.5 bg-muted" />
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2 pt-2"><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-page-enter flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-7 w-7 text-[#FE0404]" />
            {t('portfolio')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t('portfolioDesc')} — {projects.length} {t('projects').toLowerCase()}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={`${tCommon('search')}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <FolderKanban className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('portfolioEmpty')}</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => {
            const cfg = statusConfig[project.status] ?? statusConfig.draft;
            const members = membersByProject[project.id] ?? [];
            const owners = members.filter((m) => m.role === 'product_owner');
            const staff = members.filter((m) => m.role === 'staff' || m.role === 'super_admin');
            const clients = members.filter((m) => m.role === 'client');
            const respCount = responseCounts[project.id] || 0;
            const attCount = attachmentCounts[project.id] || 0;
            const isExpanded = expandedId === project.id;

            return (
              <Card
                key={project.id}
                className="group relative overflow-hidden border-0 shadow-md shadow-black/5 glass-v2 hover:shadow-xl transition-all duration-300 flex flex-col stagger-enter"
              >
                {/* Gradient top bar */}
                <div className={`h-1.5 bg-gradient-to-r ${cfg.bar}`} />

                <CardContent className="p-5 flex flex-col flex-1">
                  {/* Title + Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-base leading-snug truncate group-hover:text-[#FE0404] transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {project.description || t('noDescription')}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] font-medium px-2 py-0.5 shrink-0 ${cfg.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} mr-1 inline-block`} />
                      {tCommon(statusKey(project.status))}
                    </Badge>
                  </div>

                  {/* Requirement type tags */}
                  {project.requirement_type?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.requirement_type.map((rt) => (
                        <span key={rt} className="inline-flex items-center gap-1 text-[10px] font-medium rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                          <Globe className="h-2.5 w-2.5" />
                          {rt.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick stats row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1" title="Responses">
                      <MessageSquare className="h-3 w-3" />{respCount}
                    </span>
                    <span className="flex items-center gap-1" title="Team members">
                      <Users className="h-3 w-3" />{members.length}
                    </span>
                    {attCount > 0 && (
                      <span className="flex items-center gap-1" title="Attachments">
                        <Paperclip className="h-3 w-3" />{attCount}
                      </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto" title="Last updated">
                      <Clock className="h-3 w-3" />{relativeTime(project.updated_at || project.created_at, locale)}
                    </span>
                  </div>

                  {/* Product Owners avatars */}
                  {owners.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex -space-x-2">
                        {owners.slice(0, 3).map((o) => (
                          <div
                            key={o.email}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold ring-2 ring-card"
                            title={`${o.full_name} (PO)`}
                          >
                            {o.full_name?.[0]?.toUpperCase() ?? o.email[0].toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">
                        {owners.map((o) => o.full_name || o.email).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Expand / Collapse details */}
                  <div className="border-t pt-3 mt-1 space-y-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : project.id)}
                      className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {isExpanded && (
                      <div className="space-y-4 animate-slide-up">
                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">{t('createdOn')}</p>
                            <p className="font-medium flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(project.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('lastUpdated')}</p>
                            <p className="font-medium flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {new Date(project.updated_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Team Members */}
                        {members.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <Users className="h-3 w-3" /> {t('teamMembers')}
                            </p>
                            <div className="space-y-1.5">
                              {members.map((m) => {
                                const rl = roleLabels[m.role] ?? { label: m.role, color: 'text-muted-foreground' };
                                return (
                                  <div key={m.email} className="flex items-center justify-between gap-2 text-xs rounded-lg bg-muted/50 px-2.5 py-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-[10px] font-bold shrink-0 ring-1 ring-border">
                                        {m.full_name?.[0]?.toUpperCase() ?? m.email[0].toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-medium truncate">{m.full_name || m.email}</p>
                                        <p className="text-muted-foreground truncate">{m.email}</p>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className={`text-[9px] shrink-0 ${rl.color}`}>
                                      <Shield className="h-2.5 w-2.5 mr-0.5" />
                                      {rl.label}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Links */}
                        <div className="flex flex-wrap gap-2">
                          {project.onedrive_link && (
                            <a
                              href={project.onedrive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#FE0404] hover:underline"
                            >
                              <Link2 className="h-3 w-3" /> OneDrive
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Link href={`/projects/${project.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                              {tCommon('edit')}
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                          {project.status === 'active' && (
                            <Link href={`/form/${project.slug}/fill`} className="flex-1">
                              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                                <ExternalLink className="h-3 w-3" />
                                Form
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
