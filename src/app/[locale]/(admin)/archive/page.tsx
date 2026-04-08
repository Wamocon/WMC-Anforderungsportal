'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { statusKey } from '@/lib/utils';
import {
  Archive,
  Users,
  MessageSquare,
  Trash2,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type ArchivedProject = {
  id: string;
  original_project_id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  members_snapshot: Array<{ email: string; full_name: string; role: string }>;
  responses_snapshot: Array<{
    respondent_email: string; respondent_name: string | null;
    status: string; progress_percent: number;
  }>;
  archived_by: string | null;
  archived_reason: string | null;
  original_created_at: string | null;
  archived_at: string;
};

export default function ArchivePage() {
  const t = useTranslations();
  const locale = useLocale();
  const [archives, setArchives] = useState<ArchivedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        await supabase.auth.refreshSession();
        const { data, error } = await supabase
          .from('archived_projects')
          .select('*')
          .order('archived_at', { ascending: false });
        if (error) {
          toast.error(t('errors.loadFailed'));
          console.error(error);
        }
        setArchives((data ?? []) as unknown as ArchivedProject[]);
      } catch {
        toast.error(t('errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [t]);

  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function permanentDelete(archive: ArchivedProject) {
    if (!confirm(t('admin.permanentDeleteConfirm', { name: archive.name }))) return;
    setDeletingId(archive.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('archived_projects')
        .delete()
        .eq('id', archive.id);
      if (error) {
        toast.error(`${t('errors.deleteFailed')}: ${error.message}`);
        return;
      }
      setArchives(prev => prev.filter(a => a.id !== archive.id));
      toast.success(t('admin.permanentDeleteSuccess'));
    } catch {
      toast.error(t('errors.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
          <Archive className="h-7 w-7 text-orange-500" />
          {t('admin.archivedProjects')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.archivedProjectsDesc')}
        </p>
      </div>

      {archives.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <Archive className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('admin.noArchivedProjects')}</h3>
            <p className="text-muted-foreground max-w-md">
              {t('admin.noArchivedProjectsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {archives.map((archive) => {
            const members = Array.isArray(archive.members_snapshot) ? archive.members_snapshot : [];
            const responses = Array.isArray(archive.responses_snapshot) ? archive.responses_snapshot : [];
            const isExpanded = expandedIds.has(archive.id);

            return (
              <Card key={archive.id} className="overflow-hidden border-l-4 border-l-orange-400">
                <CardContent className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{archive.name}</h3>
                      {archive.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{archive.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          {t(`common.${statusKey(archive.status)}`)}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {members.length}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          {responses.length}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {t('admin.archivedOn')}: {new Date(archive.archived_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {archive.archived_reason && (
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {t('admin.reason')}: {archive.archived_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleExpand(archive.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => permanentDelete(archive)}
                        disabled={deletingId === archive.id}
                        title={t('admin.permanentDelete')}
                      >
                        {deletingId === archive.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Members */}
                      {members.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            {t('admin.membersAtArchival')}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {members.map((m, i) => (
                              <Badge key={i} variant="outline" className="text-xs gap-1">
                                <span className="font-medium">{m.full_name || m.email}</span>
                                <span className="text-muted-foreground">({m.role})</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Responses */}
                      {responses.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            {t('admin.responsesAtArchival')}
                          </p>
                          <div className="space-y-2">
                            {responses.map((r, i) => (
                              <div key={i} className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2 text-sm">
                                <span className="font-medium truncate">{r.respondent_name || r.respondent_email}</span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">{t(`common.${statusKey(r.status)}`)}</Badge>
                                <span className="text-xs text-muted-foreground shrink-0">{r.progress_percent}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {archive.original_created_at && (
                        <p className="text-xs text-muted-foreground/60">
                          Originally created: {new Date(archive.original_created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      )}
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
