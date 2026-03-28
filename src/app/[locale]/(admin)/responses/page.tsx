'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquareText, Download, Eye, Loader2 } from 'lucide-react';
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

export default function ResponsesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      await supabase.auth.refreshSession();

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

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    in_progress: 'bg-blue-100 text-blue-800',
    submitted: 'bg-green-100 text-green-800',
    reviewed: 'bg-purple-100 text-purple-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('response.allResponses')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.reviewSubmissions')}
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start sm:self-center shrink-0" onClick={() => {
          const csv = [
            ['Name', 'Email', 'Project', 'Status', 'Progress', 'Created'].join(','),
            ...responses.map(r => [
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

      {responses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <MessageSquareText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('admin.noResponsesTable')}</h3>
            <p className="text-muted-foreground max-w-md">
              {t('response.noResponses')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('response.respondent')}</TableHead>
                <TableHead>{t('admin.projectLabel')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.progress')}</TableHead>
                <TableHead>{t('common.createdAt')}</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow key={response.id} className="hover:bg-accent/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FE0404]/10 text-[#FE0404] font-semibold text-xs shrink-0">
                        {(response.respondent_name || response.respondent_email)?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{response.respondent_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{response.respondent_email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{projectMap[response.project_id] || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[response.status] || ''}>
                      {response.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={response.progress_percent} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground w-8 shrink-0">{response.progress_percent}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(response.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <Link href={`/responses/${response.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1 h-8">
                        <Eye className="h-3.5 w-3.5" />
                        {t('admin.view')}
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
