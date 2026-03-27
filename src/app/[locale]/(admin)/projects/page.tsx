'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Plus, FolderKanban, MoreVertical, Users, ExternalLink, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from '@/i18n/navigation';

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  created_at: string;
};

export default function ProjectsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      await supabase.auth.refreshSession();

      const [{ data: projData }, { data: respData }] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('responses').select('project_id, status'),
      ]);

      setProjects((projData ?? []) as ProjectRow[]);

      const counts = (respData ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.project_id] = (acc[r.project_id] || 0) + 1;
        return acc;
      }, {});
      setResponseCounts(counts);
      setLoading(false);
    }
    load();
  }, []);

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    archived: 'bg-orange-100 text-orange-800',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('admin.projects')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your requirement collection projects
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2">
            <Plus className="h-4 w-4" />
            {t('project.newProject')}
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <FolderKanban className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {t('project.noProjects')}
            </p>
            <Link href="/projects/new">
              <Button className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2">
                <Plus className="h-4 w-4" />
                {t('project.newProject')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const count = responseCounts[project.id] || 0;
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="transition-all hover:shadow-md hover:border-[#FE0404]/20 cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{project.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {project.description || 'No description'}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}`); }}>{t('common.edit')}</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
                            const supabase = createClient();
                            const { error } = await supabase.from('projects').delete().eq('id', project.id);
                            if (error) { toast.error(error.message); return; }
                            setProjects(prev => prev.filter(p => p.id !== project.id));
                            toast.success('Project deleted');
                          }}>
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Badge variant="secondary" className={statusColors[project.status] || ''}>
                        {project.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {count} {t('admin.responses').toLowerCase()}
                      </span>
                    </div>
                    {project.status === 'active' && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          /form/{project.slug}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
