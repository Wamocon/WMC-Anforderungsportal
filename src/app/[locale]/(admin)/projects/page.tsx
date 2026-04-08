'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Plus, FolderKanban, MoreVertical, ExternalLink,
  Search, X, ArrowUpDown, UserCircle2, Crown, Briefcase,
  Clock, MessageSquare, Trash2, Loader2, CheckSquare, Square, Archive,
  CheckCircle2, XCircle, Hourglass, Link2, Paperclip,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';
import { statusKey } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

type SortOption = 'newest' | 'name_asc' | 'responses';

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

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
  } catch {
    // fallback
  }
  return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

const STATUS_FILTERS = ['all', 'pending_review', 'active', 'draft', 'archived'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusConfig: Record<string, { label: string; bar: string; badge: string }> = {
  active:         { label: 'Active',         bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  draft:          { label: 'Draft',          bar: 'bg-slate-400',   badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  archived:       { label: 'Archived',       bar: 'bg-orange-400',  badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  pending_review: { label: 'Pending Review', bar: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
};

const statusTabColors: Record<StatusFilter, string> = {
  all:            'bg-foreground text-background',
  pending_review: 'bg-amber-500 text-white',
  active:         'bg-emerald-600 text-white',
  draft:          'bg-slate-500 text-white',
  archived:       'bg-orange-500 text-white',
};

export default function ProjectsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [membersByProject, setMembersByProject] = useState<Record<string, ProjectMember[]>>({});
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Filter & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [bulkArchiveDialogOpen, setBulkArchiveDialogOpen] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkArchiveDialogOpen(false);
    setDeleting(true);
    const supabase = createClient();
    const ids = Array.from(selectedIds);
    let successCount = 0;
    for (const id of ids) {
      try {
        const { error } = await supabase.rpc('archive_project', {
          p_project_id: id,
          p_reason: 'Bulk archive from projects page',
        });
        if (error) {
          console.error(`Archive failed for ${id}:`, error.message);
          toast.error(`${t('admin.archiveFailed')}: ${error.message}`);
        } else {
          successCount++;
        }
      } catch (err) {
        toast.error(t('errors.generic'));
      }
    }
    if (successCount > 0) {
      setProjects((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      toast.success(t('admin.projectsArchived', { count: String(successCount) }));
    }
    setSelectedIds(new Set());
    setDeleting(false);
  }

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: session } = await supabase.auth.refreshSession();
        if (!session?.session) { setLoading(false); return; }

      const [{ data: projData }, { data: respData }] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('responses').select('project_id, status'),
      ]);

      // RPC may fail for non-admin roles — handle gracefully
      let membersData: ProjectMember[] = [];
      try {
        const { data, error } = await supabase.rpc('get_project_members_info');
        if (!error && data) membersData = data as ProjectMember[];
      } catch { /* ignored — members just won't appear */ }

      // Fetch attachment counts per project
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: attData } = await (supabase as any)
          .from('project_attachments')
          .select('project_id');
        const attCounts = ((attData ?? []) as { project_id: string }[]).reduce<Record<string, number>>((acc, r) => {
          acc[r.project_id] = (acc[r.project_id] || 0) + 1;
          return acc;
        }, {});
        setAttachmentCounts(attCounts);
      } catch { /* non-critical */ }

      setProjects((projData ?? []) as ProjectRow[]);

      const counts = (respData ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.project_id] = (acc[r.project_id] || 0) + 1;
        return acc;
      }, {});
      setResponseCounts(counts);

      const byProject = (membersData).reduce<Record<string, ProjectMember[]>>(
        (acc, m) => {
          if (!acc[m.project_id]) acc[m.project_id] = [];
          acc[m.project_id].push(m);
          return acc;
        },
        {}
      );
      setMembersByProject(byProject);
      setLoading(false);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setLoadError(t('errors.loadFailed'));
        setLoading(false);
      }
    }
    load();
  }, []);

  // Unique owners for filter dropdown
  const allOwners = useMemo(() => {
    const seen = new Map<string, string>();
    Object.values(membersByProject).flat().forEach((m) => {
      if (m.role === 'product_owner' && !seen.has(m.email)) {
        seen.set(m.email, m.full_name || m.email);
      }
    });
    return Array.from(seen.entries()).map(([email, name]) => ({ email, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [membersByProject]);

  // Filtered + sorted list
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const filteredProjects = useMemo(() => {
    let list = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => {
        const owners = (membersByProject[p.id] ?? []).filter((m) => m.role === 'product_owner');
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          owners.some((o) => o.full_name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))
        );
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (ownerFilter !== 'all') {
      list = list.filter((p) =>
        (membersByProject[p.id] ?? []).some(
          (m) => m.role === 'product_owner' && m.email === ownerFilter
        )
      );
    }

    if (sortBy === 'name_asc') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'responses') list.sort((a, b) => (responseCounts[b.id] || 0) - (responseCounts[a.id] || 0));
    // 'newest' is already sorted by created_at desc from DB

    return list;
  }, [projects, searchQuery, statusFilter, ownerFilter, sortBy, membersByProject, responseCounts]);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || ownerFilter !== 'all';
  const isSelectMode = selectedIds.size > 0;
  const allVisibleSelected = filteredProjects.length > 0 && selectedIds.size === filteredProjects.length;

  function clearFilters() {
    setSearchQuery('');
    setStatusFilter('all');
    setOwnerFilter('all');
    setSortBy('newest');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="overflow-hidden">
              <div className="h-1 bg-muted" />
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
                <div className="flex gap-1.5 pt-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="pt-2 border-t flex justify-between">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
          <FolderKanban className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('errors.somethingWentWrong')}</h3>
        <p className="text-muted-foreground max-w-md mb-4">{loadError}</p>
        <Button onClick={() => window.location.reload()}>{t('errors.tryAgain')}</Button>
      </div>
    );
  }

  const sortLabels: Record<SortOption, string> = {
    newest: t('common.newestFirst'),
    name_asc: t('common.nameAZ'),
    responses: t('common.mostResponses'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('admin.projects')}</h1>
          <p className="text-muted-foreground mt-1">
            {projects.length} {t('admin.projects').toLowerCase()} · {Object.values(responseCounts).reduce((a, b) => a + b, 0)} {t('common.totalResponses').toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filteredProjects.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="gap-2 text-xs"
            >
              {allVisibleSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {allVisibleSelected ? t('common.deselectAll') : t('common.selectAll')}
            </Button>
          )}
          <Link href="/projects/new">
            <Button className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              {t('project.newProject')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t('requirements.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Owner filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 shrink-0">
                <UserCircle2 className="h-4 w-4" />
                {ownerFilter === 'all'
                  ? t('requirements.allOwners')
                  : allOwners.find((o) => o.email === ownerFilter)?.name ?? ownerFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>{t('requirements.filterByOwner')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOwnerFilter('all')}>
                <span className={ownerFilter === 'all' ? 'font-semibold' : ''}>{t('requirements.allOwners')}</span>
              </DropdownMenuItem>
              {allOwners.map((o) => (
                <DropdownMenuItem key={o.email} onClick={() => setOwnerFilter(o.email)}>
                  <span className={ownerFilter === o.email ? 'font-semibold' : ''}>{o.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 shrink-0">
                <ArrowUpDown className="h-4 w-4" />
                {sortLabels[sortBy]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('requirements.sortBy')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                <DropdownMenuItem key={key} onClick={() => setSortBy(key)}>
                  <span className={sortBy === key ? 'font-semibold' : ''}>{sortLabels[key]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const count =
              s === 'all'
                ? projects.length
                : projects.filter((p) => p.status === s).length;
            const isActive = statusFilter === s;
            const tabLabel = s === 'all' ? t('common.all') : t(`common.${statusKey(s)}`);
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? statusTabColors[s]
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                } ${s === 'pending_review' && count > 0 && !isActive ? 'ring-1 ring-amber-400/50' : ''}`}
              >
                {s === 'pending_review' && <Hourglass className="h-3 w-3" />}
                {tabLabel}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? 'bg-white/20' : 'bg-background'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-1"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <FolderKanban className="h-10 w-10 text-muted-foreground" />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No projects match your filters</h3>
                <p className="text-muted-foreground max-w-md mb-6">Try adjusting your search or filter criteria.</p>
                <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">{t('admin.noProjectsYet')}</h3>
                <p className="text-muted-foreground max-w-md mb-6">{t('project.noProjects')}</p>
                <Link href="/projects/new">
                  <Button className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2">
                    <Plus className="h-4 w-4" />
                    {t('project.newProject')}
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground -mt-2">
            Showing {filteredProjects.length} of {projects.length} projects
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const count = responseCounts[project.id] || 0;
              const members = membersByProject[project.id] ?? [];
              const owners = members.filter((m) => m.role === 'product_owner');
              const client = members.find((m) => m.role === 'client');
              const cfg = statusConfig[project.status] ?? statusConfig.draft;

              const isSelected = selectedIds.has(project.id);

              return (
                <div key={project.id} className="relative">
                  {/* Selection checkbox */}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelect(project.id); }}
                    className={`absolute top-3 left-3 z-10 flex h-5 w-5 items-center justify-center rounded border transition-all ${
                      isSelected
                        ? 'bg-[#FE0404] border-[#FE0404] text-white scale-110'
                        : isSelectMode
                          ? 'border-border bg-background/80 backdrop-blur-sm hover:border-[#FE0404]/50'
                          : 'border-transparent bg-transparent opacity-0 group-hover:opacity-100 group-hover:border-border group-hover:bg-background/80'
                    }`}
                  >
                    {isSelected && <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>

                <Link href={`/projects/${project.id}`}>
                  <Card className={`group overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer h-full flex flex-col border ${
                    isSelected
                      ? 'border-[#FE0404]/50 ring-1 ring-[#FE0404]/20 bg-[#FE0404]/[0.02]'
                      : 'hover:border-[#FE0404]/30'
                  }`}>
                    {/* Colored status accent bar */}
                    <div className={`h-1 w-full ${cfg.bar} transition-all duration-200 group-hover:h-1.5`} />

                    <CardContent className="p-5 pl-10 flex flex-col flex-1">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate leading-snug group-hover:text-[#FE0404] transition-colors">
                              {project.name}
                            </h3>
                            {Array.isArray(project.requirement_type) && project.requirement_type.includes('ai_application') && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-[10px] px-1.5 py-0 shrink-0">
                                AI
                              </Badge>
                            )}
                            {Array.isArray(project.requirement_type) && project.requirement_type.includes('mobile_application') && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0 shrink-0">
                                Mobile
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                            {project.description || t('admin.noDescription')}
                          </p>
                          {/* OneDrive link + attachment count for pending_review */}
                          {project.status === 'pending_review' && (project.onedrive_link || (attachmentCounts[project.id] ?? 0) > 0) && (
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {project.onedrive_link && (
                                <a
                                  href={project.onedrive_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link2 className="h-3 w-3" />
                                  {t('admin.oneDriveLink')}
                                </a>
                              )}
                              {(attachmentCounts[project.id] ?? 0) > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Paperclip className="h-3 w-3" />
                                  {attachmentCounts[project.id]} {t('admin.filesAttached')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            asChild
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0 -mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {project.status === 'pending_review' ? (
                              <>
                                <DropdownMenuItem
                                  className="text-emerald-600 focus:text-emerald-600"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const supabase = createClient();
                                    const { error } = await supabase.rpc('approve_project', { p_project_id: project.id });
                                    if (error) { toast.error(`${t('admin.approveFailed')}: ${error.message}`); return; }
                                    setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, status: 'active' } : p));
                                    toast.success(t('admin.projectApproved'));
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {t('admin.approveProject')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (!confirm(t('admin.rejectProjectConfirm', { name: project.name }))) return;
                                    const supabase = createClient();
                                    const { error } = await supabase.rpc('reject_project', { p_project_id: project.id, p_reason: 'Rejected by staff' });
                                    if (error) { toast.error(`${t('admin.rejectFailed')}: ${error.message}`); return; }
                                    setProjects((prev) => prev.filter((p) => p.id !== project.id));
                                    toast.success(t('admin.projectRejected'));
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  {t('admin.rejectProject')}
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}`); }}>
                                  {t('common.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (!confirm(t('admin.archiveProjectConfirm', { name: project.name }))) return;
                                    const supabase = createClient();
                                    const { error } = await supabase.rpc('archive_project', {
                                      p_project_id: project.id,
                                      p_reason: 'Archived from project menu',
                                    });
                                    if (error) { toast.error(`${t('admin.archiveFailed')}: ${error.message}`); return; }
                                    setProjects((prev) => prev.filter((p) => p.id !== project.id));
                                    toast.success(t('admin.projectArchived'));
                                  }}
                                >
                                  {t('admin.archive')}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* People chips */}
                      {(owners.length > 0 || client) && (
                        <div className="mt-3 space-y-1.5">
                          {owners.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                              {owners.map((o) => (
                                <span
                                  key={o.email}
                                  title={o.email}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-800/50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 leading-none"
                                >
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-700 text-[9px] font-bold text-amber-900 dark:text-amber-100 shrink-0">
                                    {getInitials(o.full_name)}
                                  </span>
                                  {o.full_name.split(' ')[0]}
                                </span>
                              ))}
                            </div>
                          )}
                          {client && (
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3 w-3 text-blue-500 shrink-0" />
                              <span
                                title={client.email}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200/70 dark:border-blue-800/50 px-2 py-0.5 text-[11px] font-medium text-blue-800 dark:text-blue-300 leading-none"
                              >
                                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-200 dark:bg-blue-700 text-[9px] font-bold text-blue-900 dark:text-blue-100 shrink-0">
                                  {getInitials(client.full_name)}
                                </span>
                                {client.full_name.split(' ')[0]}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex-1" />

                      {/* Footer */}
                      <div className="mt-4 pt-3 border-t flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-[11px] font-medium px-2 py-0.5 ${cfg.badge}`}>
                            {t(`common.${statusKey(project.status)}`)}
                          </Badge>
                          <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 transition-colors ${
                            count > 0
                              ? 'bg-[#FE0404]/10 text-[#FE0404]'
                              : 'text-muted-foreground'
                          }`}>
                            <MessageSquare className="h-3 w-3" />
                            {count}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground min-w-0">
                          {project.status === 'active' && (
                            <span className="flex items-center gap-1 truncate">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">/form/{project.slug}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {relativeTime(project.updated_at || project.created_at, locale)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Bulk delete floating bar */}
      {isSelectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 px-5 py-3">
            <span className="text-sm font-medium">
              {selectedIds.size} {t('common.selected')}
            </span>
            <div className="h-5 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setBulkArchiveDialogOpen(true)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
              {t('admin.archive')} {selectedIds.size > 1 ? `${selectedIds.size} ${t('admin.projects').toLowerCase()}` : t('admin.projects').toLowerCase().slice(0, -1)}
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Archive Confirmation Dialog */}
      <Dialog open={bulkArchiveDialogOpen} onOpenChange={setBulkArchiveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.confirmAction')}</DialogTitle>
            <DialogDescription>
              {t('admin.archiveProjectsConfirm', { count: String(selectedIds.size) })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBulkArchiveDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={deleting} className="gap-2">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
              {t('admin.archive')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
