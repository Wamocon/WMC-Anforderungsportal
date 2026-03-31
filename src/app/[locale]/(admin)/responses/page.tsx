'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareText, Download, Eye, Search, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';

type ResponseRow = {
  id: string;
  project_id: string;
  respondent_name: string | null;
  respondent_email: string;
  status: string;
  progress_percent: number;
  created_at: string;
  updated_at: string;
};

const STATUS_FILTERS = ['all', 'draft', 'in_progress', 'submitted', 'reviewed'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const statusConfig: Record<string, { label: string; color: string; tabActive: string }> = {
  draft:       { label: 'Draft',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400', tabActive: 'bg-slate-500 text-white' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', tabActive: 'bg-blue-600 text-white' },
  submitted:   { label: 'Submitted',   color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', tabActive: 'bg-green-600 text-white' },
  reviewed:    { label: 'Reviewed',    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', tabActive: 'bg-purple-600 text-white' },
};

export default function ResponsesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: session } = await supabase.auth.refreshSession();
      if (!session?.session) { setLoading(false); return; }

      const [{ data: respData }, { data: projData }] = await Promise.all([
        supabase.from('responses').select('*').order('updated_at', { ascending: false }),
        supabase.from('projects').select('id, name'),
      ]);

      setResponses((respData ?? []) as ResponseRow[]);
      setProjectMap(
        (projData ?? []).reduce<Record<string, string>>((acc, p) => {
          acc[p.id] = p.name;
          return acc;
        }, {})
      );
      setLoading(false);
    }
    load();
  }, []);

  const filteredResponses = useMemo(() => {
    let list = responses;
    if (statusFilter !== 'all') list = list.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) =>
        (r.respondent_name ?? '').toLowerCase().includes(q) ||
        r.respondent_email.toLowerCase().includes(q) ||
        (projectMap[r.project_id] ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [responses, statusFilter, searchQuery, projectMap]);

  const hasActiveFilters = searchQuery || statusFilter !== 'all';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /></div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex gap-2"><Skeleton className="h-10 flex-1" /></div>
        <div className="flex gap-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-7 w-24 rounded-full" />)}</div>
        <Card><CardContent className="p-0">{[1,2,3].map(i => <div key={i} className="flex items-center gap-4 px-6 py-4 border-b"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></div><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-2 w-24" /><Skeleton className="h-4 w-16" /></div>)}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('response.allResponses')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {responses.length} total · {responses.filter(r => r.status === 'submitted').length} pending review
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start sm:self-center shrink-0" onClick={() => {
          const csv = [
            ['Name', 'Email', 'Project', 'Status', 'Progress', 'Created'].join(','),
            ...filteredResponses.map(r => [
              r.respondent_name || '',
              r.respondent_email,
              projectMap[r.project_id] || '',
              r.status,
              `${r.progress_percent}%`,
              new Date(r.created_at).toLocaleDateString(locale),
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
          ].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `responses-${new Date().toISOString().slice(0,10)}.csv`;
          a.click(); URL.revokeObjectURL(url);
        }}>
          <Download className="h-4 w-4" />
          {t('admin.exportAll')}
        </Button>
      </div>

      {/* Search + Status tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, email, or project…"
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
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((s) => {
            const count = s === 'all' ? responses.length : responses.filter(r => r.status === s).length;
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? (s === 'all' ? 'bg-foreground text-background' : statusConfig[s]?.tabActive ?? 'bg-foreground text-background')
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {s === 'all' ? 'All' : statusConfig[s]?.label ?? s}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20' : 'bg-background'}`}>
                  {count}
                </span>
              </button>
            );
          })}
          {hasActiveFilters && (
            <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-1">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {filteredResponses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <MessageSquareText className="h-10 w-10 text-muted-foreground" />
            </div>
            {hasActiveFilters ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No responses match your filters</h3>
                <p className="text-muted-foreground max-w-md mb-6">Try adjusting your search or filter criteria.</p>
                <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>Clear Filters</Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">{t('admin.noResponsesTable')}</h3>
                <p className="text-muted-foreground max-w-md">{t('response.noResponses')}</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground -mt-2">
            Showing {filteredResponses.length} of {responses.length} responses
          </p>
          <Card className="overflow-hidden border">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-semibold">{t('response.respondent')}</TableHead>
                  <TableHead className="font-semibold">{t('admin.projectLabel')}</TableHead>
                  <TableHead className="font-semibold">{t('common.status')}</TableHead>
                  <TableHead className="font-semibold">{t('common.progress')}</TableHead>
                  <TableHead className="font-semibold">{t('common.createdAt')}</TableHead>
                  <TableHead className="font-semibold">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map((response) => {
                  const cfg = statusConfig[response.status];
                  return (
                    <TableRow key={response.id} className="hover:bg-accent/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FE0404]/10 text-[#FE0404] font-semibold text-xs shrink-0">
                            {(response.respondent_name || response.respondent_email)?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{response.respondent_name || '—'}</p>
                            <p className="text-xs text-muted-foreground truncate">{response.respondent_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{projectMap[response.project_id] || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={cfg?.color ?? ''}>
                          {cfg?.label ?? response.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={response.progress_percent} className="h-2 flex-1" />
                          <span className={`text-xs w-9 text-right shrink-0 font-medium ${
                            response.progress_percent === 100 ? 'text-green-600' : 'text-muted-foreground'
                          }`}>
                            {response.progress_percent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(response.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Link href={`/responses/${response.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1.5 h-8 hover:bg-[#FE0404]/10 hover:text-[#FE0404]">
                            <Eye className="h-3.5 w-3.5" />
                            {t('admin.view')}
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
