'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
  Search, X, Download, Filter, Eye, ClipboardCheck,
  Smartphone, Brain, ArrowUpDown, FolderKanban,
  CheckCircle2, Clock, FileEdit, Hourglass,
  BarChart3, ListFilter, MoreVertical, Info, Globe,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';
import { toast } from 'sonner';
import { statusKey } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type RequirementRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  requirement_type: string[];
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
};

type MemberInfo = {
  project_id: string;
  role: string;
  email: string;
  full_name: string;
};

type ResponseInfo = {
  project_id: string;
  status: string;
  progress_percent: number;
};

type SortOption = 'newest' | 'name_asc' | 'name_desc' | 'approved_date';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_FILTERS = ['all', 'web_application', 'mobile_application', 'ai_application'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const STATUS_FILTERS = ['all', 'pending_review', 'active', 'draft', 'archived'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock; tabColor: string }> = {
  draft:          { label: 'Draft',          color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', icon: FileEdit, tabColor: 'bg-slate-500 text-white' },
  pending_review: { label: 'Pending Review', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Hourglass, tabColor: 'bg-amber-500 text-white' },
  active:         { label: 'Active',         color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2, tabColor: 'bg-emerald-600 text-white' },
  archived:       { label: 'Archived',       color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: FolderKanban, tabColor: 'bg-orange-500 text-white' },
};

const typeConfig: Record<string, { label: string; icon: typeof Smartphone; color: string; bg: string }> = {
  web_application:    { label: 'Web Application',    icon: Globe,      color: 'text-blue-600',   bg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  mobile_application: { label: 'Mobile Application', icon: Smartphone, color: 'text-green-600',  bg: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  ai_application:     { label: 'AI Application',     icon: Brain,      color: 'text-purple-600', bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RequirementsPage() {
  const t = useTranslations();
  const locale = useLocale();

  // Data state
  const [projects, setProjects] = useState<RequirementRow[]>([]);
  const [membersByProject, setMembersByProject] = useState<Record<string, MemberInfo[]>>({});
  const [responsesByProject, setResponsesByProject] = useState<Record<string, ResponseInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter & sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // ─── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: session } = await supabase.auth.refreshSession();
        if (!session?.session) { setLoading(false); return; }

        // Parallel fetches for maximum speed
        const [projectsRes, responsesRes, membersRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, name, slug, description, status, requirement_type, created_at, updated_at, approved_at, approved_by')
            .order('created_at', { ascending: false }),
          supabase
            .from('responses')
            .select('project_id, status, progress_percent'),
          Promise.resolve(supabase.rpc('get_project_members_info')).catch(() => ({ data: null, error: null })),
        ]);

        setProjects((projectsRes.data ?? []) as RequirementRow[]);

        // Group responses by project
        const respByProject: Record<string, ResponseInfo[]> = {};
        ((responsesRes.data ?? []) as ResponseInfo[]).forEach(r => {
          if (!respByProject[r.project_id]) respByProject[r.project_id] = [];
          respByProject[r.project_id].push(r);
        });
        setResponsesByProject(respByProject);

        // Group members by project
        const memByProject: Record<string, MemberInfo[]> = {};
        ((membersRes.data ?? []) as MemberInfo[]).forEach(m => {
          if (!memByProject[m.project_id]) memByProject[m.project_id] = [];
          memByProject[m.project_id].push(m);
        });
        setMembersByProject(memByProject);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load requirements:', err);
        setLoadError(t('errors.loadFailed'));
        setLoading(false);
      }
    }
    load();
  }, [t]);

  // ─── Derived data ─────────────────────────────────────────────────────────

  // Unique owners for filter dropdown
  const allOwners = useMemo(() => {
    const seen = new Map<string, string>();
    Object.values(membersByProject).flat().forEach((m) => {
      if (m.role === 'product_owner' && !seen.has(m.email)) {
        seen.set(m.email, m.full_name || m.email);
      }
    });
    return Array.from(seen.entries()).map(([email, name]) => ({ email, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [membersByProject]);

  // Filtered + sorted list
  const filteredProjects = useMemo(() => {
    let list = [...projects];

    // Type filter
    if (typeFilter !== 'all') {
      list = list.filter(p => Array.isArray(p.requirement_type) && p.requirement_type.includes(typeFilter));
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter(p => p.status === statusFilter);
    }

    // Owner filter
    if (ownerFilter !== 'all') {
      list = list.filter(p =>
        (membersByProject[p.id] ?? []).some(
          m => m.role === 'product_owner' && m.email === ownerFilter
        )
      );
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(p => {
        const owners = (membersByProject[p.id] ?? []).filter(m => m.role === 'product_owner');
        return (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          owners.some(o => (o.full_name ?? '').toLowerCase().includes(q) || (o.email ?? '').toLowerCase().includes(q))
        );
      });
    }

    // Sort
    switch (sortBy) {
      case 'name_asc': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name_desc': list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'approved_date': list.sort((a, b) => {
        if (!a.approved_at && !b.approved_at) return 0;
        if (!a.approved_at) return 1;
        if (!b.approved_at) return -1;
        return new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime();
      }); break;
      // 'newest' is already sorted by created_at desc
    }

    return list;
  }, [projects, typeFilter, statusFilter, ownerFilter, searchQuery, sortBy, membersByProject]);

  const hasActiveFilters = searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || ownerFilter !== 'all';

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: projects.length,
    webApp: projects.filter(p => Array.isArray(p.requirement_type) && p.requirement_type.includes('web_application')).length,
    mobileApp: projects.filter(p => Array.isArray(p.requirement_type) && p.requirement_type.includes('mobile_application')).length,
    aiApp: projects.filter(p => Array.isArray(p.requirement_type) && p.requirement_type.includes('ai_application')).length,
    active: projects.filter(p => p.status === 'active').length,
    pending: projects.filter(p => p.status === 'pending_review').length,
    approved: projects.filter(p => p.approved_at).length,
  }), [projects]);

  // ─── CSV Export ───────────────────────────────────────────────────────────

  const handleExport = useCallback(() => {
    const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    const headers = [
      t('requirements.appName'),
      t('requirements.developer'),
      t('requirements.approver'),
      t('requirements.createdDate'),
      t('requirements.approvedDate'),
      t('requirements.type'),
      t('common.status'),
      t('common.progress'),
    ];

    const rows = filteredProjects.map(p => {
      const members = membersByProject[p.id] ?? [];
      const owners = members.filter(m => m.role === 'product_owner').map(m => m.full_name).join('; ');
      const clients = members.filter(m => m.role === 'client').map(m => m.full_name).join('; ');
      const responses = responsesByProject[p.id] ?? [];
      const avgProgress = responses.length > 0
        ? Math.round(responses.reduce((sum, r) => sum + r.progress_percent, 0) / responses.length)
        : 0;
      const typeLabel = Array.isArray(p.requirement_type)
        ? p.requirement_type.map(rt => {
            const key = rt === 'web_application' ? 'webApplication' : rt === 'mobile_application' ? 'mobileApplication' : 'aiApplication';
            return t(`requirements.${key}`);
          }).join(' + ')
        : p.requirement_type;
      const statusLabel = statusConfig[p.status]?.label ?? p.status;

      return [
        p.name,
        owners,
        clients,
        new Date(p.created_at).toLocaleDateString(locale),
        p.approved_at ? new Date(p.approved_at).toLocaleDateString(locale) : '—',
        typeLabel,
        statusLabel,
        `${avgProgress}%`,
      ];
    });

    const csv = BOM + [
      headers.join(','),
      ...rows.map(row =>
        row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requirements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('requirements.exportSuccess', { count: String(filteredProjects.length) }));
  }, [filteredProjects, membersByProject, responsesByProject, locale, t]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function clearFilters() {
    setSearchQuery('');
    setTypeFilter('all');
    setStatusFilter('all');
    setOwnerFilter('all');
    setSortBy('newest');
  }

  const sortLabels: Record<SortOption, string> = {
    newest: t('requirements.sortNewest'),
    name_asc: t('requirements.sortNameAsc'),
    name_desc: t('requirements.sortNameDesc'),
    approved_date: t('requirements.sortApproved'),
  };

  // ─── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2"><Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /></div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="flex gap-2"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-36" /><Skeleton className="h-10 w-36" /></div>
        <Card><CardContent className="p-0">{[1,2,3,4,5].map(i => <div key={i} className="flex items-center gap-4 px-6 py-4 border-b"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-5 w-20 rounded-full" /></div>)}</CardContent></Card>
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('requirements.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('requirements.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 shrink-0"
            onClick={handleExport}
            disabled={filteredProjects.length === 0}
          >
            <Download className="h-4 w-4" />
            {t('requirements.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('requirements.totalRequirements')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Globe className="h-4 w-4 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{stats.webApp}</p>
            </div>
            <p className="text-xs text-blue-600/70 mt-0.5">{t('requirements.webApplication')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Smartphone className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{stats.mobileApp}</p>
            </div>
            <p className="text-xs text-green-600/70 mt-0.5">{t('requirements.mobileApplication')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Brain className="h-4 w-4 text-purple-600" />
              <p className="text-2xl font-bold text-purple-600">{stats.aiApp}</p>
            </div>
            <p className="text-xs text-purple-600/70 mt-0.5">{t('requirements.aiApplication')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            <p className="text-xs text-emerald-600/70 mt-0.5">{t('common.active')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-amber-600/70 mt-0.5">{t('common.pendingReview')}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-green-600/70 mt-0.5">{t('requirements.approved')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(v) => { if (v) setTypeFilter(v as TypeFilter); }}>
            <SelectTrigger className="w-[180px] shrink-0">
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('requirements.allTypes')}</SelectItem>
              <SelectItem value="web_application">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                  {t('requirements.webApplication')}
                </div>
              </SelectItem>
              <SelectItem value="mobile_application">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-green-600" />
                  {t('requirements.mobileApplication')}
                </div>
              </SelectItem>
              <SelectItem value="ai_application">
                <div className="flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5 text-purple-600" />
                  {t('requirements.aiApplication')}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Owner filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 shrink-0">
                <Filter className="h-4 w-4" />
                {ownerFilter === 'all'
                  ? t('requirements.allOwners')
                  : allOwners.find(o => o.email === ownerFilter)?.name ?? ownerFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 max-h-72 overflow-y-auto">
              <DropdownMenuLabel>{t('requirements.filterByOwner')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setOwnerFilter('all')}>
                <span className={ownerFilter === 'all' ? 'font-semibold' : ''}>{t('requirements.allOwners')}</span>
              </DropdownMenuItem>
              {allOwners.map(o => (
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
              {(Object.keys(sortLabels) as SortOption[]).map(key => (
                <DropdownMenuItem key={key} onClick={() => setSortBy(key)}>
                  <span className={sortBy === key ? 'font-semibold' : ''}>{sortLabels[key]}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => {
            const count = s === 'all' ? projects.length : projects.filter(p => p.status === s).length;
            const isActive = statusFilter === s;
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? (s === 'all' ? 'bg-foreground text-background' : cfg?.tabColor ?? 'bg-foreground text-background')
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {s !== 'all' && cfg && <cfg.icon className="h-3 w-3" />}
                {s === 'all' ? t('common.all') : t(`common.${statusKey(s)}`)}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-background'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-1">
              <X className="h-3 w-3" />
              {t('requirements.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Tutorial hint */}
      <div className="rounded-xl border border-blue-200/40 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/10 px-4 py-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('requirements.tutorialTitle')}</p>
          <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-0.5">{t('requirements.tutorialDesc')}</p>
        </div>
      </div>

      {/* Results */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <FolderKanban className="h-10 w-10 text-muted-foreground" />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-semibold mb-2">{t('requirements.noMatch')}</h3>
                <p className="text-muted-foreground max-w-md mb-6">{t('requirements.noMatchDesc')}</p>
                <Button variant="outline" onClick={clearFilters}>{t('requirements.clearFilters')}</Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">{t('requirements.noRequirements')}</h3>
                <p className="text-muted-foreground max-w-md">{t('requirements.noRequirementsDesc')}</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground -mt-2">
            {t('requirements.showing', { filtered: String(filteredProjects.length), total: String(projects.length) })}
          </p>

          <Card className="overflow-hidden border">
            <div className="overflow-x-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="font-semibold">{t('requirements.appName')}</TableHead>
                      <TableHead className="font-semibold">{t('requirements.type')}</TableHead>
                      <TableHead className="font-semibold">{t('requirements.developer')}</TableHead>
                      <TableHead className="font-semibold">{t('requirements.approver')}</TableHead>
                      <TableHead className="font-semibold">{t('requirements.createdDate')}</TableHead>
                      <TableHead className="font-semibold">{t('requirements.approvedDate')}</TableHead>
                      <TableHead className="font-semibold">{t('common.status')}</TableHead>
                      <TableHead className="font-semibold">{t('common.progress')}</TableHead>
                      <TableHead className="font-semibold">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map(project => {
                      const members = membersByProject[project.id] ?? [];
                      const owners = members.filter(m => m.role === 'product_owner');
                      const clients = members.filter(m => m.role === 'client');
                      const responses = responsesByProject[project.id] ?? [];
                      const avgProgress = responses.length > 0
                        ? Math.round(responses.reduce((sum, r) => sum + r.progress_percent, 0) / responses.length)
                        : 0;
                      const cfg = statusConfig[project.status];
                      const types = Array.isArray(project.requirement_type) ? project.requirement_type : [project.requirement_type];

                      return (
                        <TableRow key={project.id} className="hover:bg-accent/30 transition-colors">
                          {/* App Name */}
                          <TableCell>
                            <div className="min-w-0">
                              <Link href={`/projects/${project.id}`} className="font-medium text-sm hover:text-[#FE0404] transition-colors">
                                {project.name}
                              </Link>
                              {project.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{project.description}</p>
                              )}
                            </div>
                          </TableCell>

                          {/* Type */}
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {types.map(rt => {
                                const cfg = typeConfig[rt] ?? typeConfig.web_application;
                                const TypeIcon = cfg.icon;
                                const key = rt === 'web_application' ? 'webApp' : rt === 'mobile_application' ? 'mobileApp' : 'aiApp';
                                return (
                                  <Badge key={rt} variant="secondary" className={`${cfg.bg} gap-1`}>
                                    <TypeIcon className="h-3 w-3" />
                                    {t(`requirements.${key}`)}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>

                          {/* Developer / Product Owner */}
                          <TableCell>
                            <div className="space-y-0.5">
                              {owners.length > 0 ? owners.map(o => (
                                <Tooltip key={o.email}>
                                  <TooltipTrigger className="text-sm truncate max-w-[120px] cursor-default text-left">{o.full_name}</TooltipTrigger>
                                  <TooltipContent>{o.email}</TooltipContent>
                                </Tooltip>
                              )) : <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </TableCell>

                          {/* Approver / Client */}
                          <TableCell>
                            <div className="space-y-0.5">
                              {clients.length > 0 ? clients.map(c => (
                                <Tooltip key={c.email}>
                                  <TooltipTrigger className="text-sm truncate max-w-[120px] cursor-default text-left">{c.full_name}</TooltipTrigger>
                                  <TooltipContent>{c.email}</TooltipContent>
                                </Tooltip>
                              )) : <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </TableCell>

                          {/* Created Date */}
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {new Date(project.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>

                          {/* Approved Date */}
                          <TableCell className="text-sm whitespace-nowrap">
                            {project.approved_at ? (
                              <span className="text-green-600 dark:text-green-400">
                                {new Date(project.approved_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge variant="secondary" className={cfg?.color ?? ''}>
                              {t(`common.${statusKey(project.status)}`)}
                            </Badge>
                          </TableCell>

                          {/* Progress */}
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Progress value={avgProgress} className="h-2 flex-1" />
                              <span className={`text-xs w-9 text-right shrink-0 font-medium ${
                                avgProgress === 100 ? 'text-green-600' : 'text-muted-foreground'
                              }`}>
                                {avgProgress}%
                              </span>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem render={<Link href={`/projects/${project.id}`} />} className="flex items-center gap-2">
                                    <Eye className="h-3.5 w-3.5" />
                                    {t('admin.view')}
                                </DropdownMenuItem>
                                <DropdownMenuItem render={<Link href={`/requirements/checklist/${project.id}`} />} className="flex items-center gap-2">
                                    <ClipboardCheck className="h-3.5 w-3.5" />
                                    {t('requirements.checklistMode')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  // Export single project
                                  const members = membersByProject[project.id] ?? [];
                                  const ownersStr = members.filter(m => m.role === 'product_owner').map(m => m.full_name).join('; ');
                                  const clientsStr = members.filter(m => m.role === 'client').map(m => m.full_name).join('; ');
                                  const typeLabel = Array.isArray(project.requirement_type)
                                    ? project.requirement_type.map(rt => {
                                        const k = rt === 'web_application' ? 'webApplication' : rt === 'mobile_application' ? 'mobileApplication' : 'aiApplication';
                                        return t(`requirements.${k}`);
                                      }).join(' + ')
                                    : String(project.requirement_type);
                                  const csv = [
                                    [t('requirements.appName'), t('requirements.developer'), t('requirements.approver'), t('requirements.createdDate'), t('requirements.approvedDate'), t('requirements.type'), t('common.status')].join(','),
                                    [project.name, ownersStr, clientsStr, new Date(project.created_at).toLocaleDateString(locale), project.approved_at ? new Date(project.approved_at).toLocaleDateString(locale) : '', typeLabel, project.status].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
                                  ].join('\n');
                                  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a'); a.href = url;
                                  a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}-requirements.csv`;
                                  a.click(); URL.revokeObjectURL(url);
                                  toast.success(t('requirements.exportSuccess', { count: '1' }));
                                }} className="flex items-center gap-2">
                                  <Download className="h-3.5 w-3.5" />
                                  {t('requirements.exportSingle')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
