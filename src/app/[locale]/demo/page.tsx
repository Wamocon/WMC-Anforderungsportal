'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { WmcLogo } from '@/components/wmc-logo';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  MessageSquareText,
  Settings,
  ChevronLeft,
  Plus,
  ArrowRight,
  Users,
  Clock,
  ExternalLink,
  Send,
  Sparkles,
  Globe,
  Shield,
  Mic,
  Bot,
} from 'lucide-react';

/* ─────── Mock Data ─────── */
const PROJECTS = [
  { id: '1', name: 'Website Redesign', slug: 'website-redesign', description: 'Complete website overhaul with new branding', status: 'active', responses: 3, total: 5, created: '2026-03-15' },
  { id: '2', name: 'CRM Integration', slug: 'crm-integration', description: 'Salesforce integration for customer onboarding', status: 'active', responses: 1, total: 3, created: '2026-03-20' },
  { id: '3', name: 'Mobile App MVP', slug: 'mobile-app', description: 'iOS & Android app for field technicians', status: 'active', responses: 5, total: 5, created: '2026-02-28' },
  { id: '4', name: 'ERP Migration', slug: 'erp-migration', description: 'Migration from SAP R/3 to S/4HANA', status: 'draft', responses: 0, total: 0, created: '2026-03-28' },
];

const RESPONSES = [
  { id: 'r1', name: 'Thomas Mueller', email: 'thomas@client.de', project: 'Website Redesign', status: 'submitted', progress: 100, date: '2026-03-28' },
  { id: 'r2', name: 'Sarah König', email: 'sarah@enterprise.com', project: 'CRM Integration', status: 'in_progress', progress: 60, date: '2026-03-27' },
  { id: 'r3', name: 'Marc Bauer', email: 'marc@startup.io', project: 'Website Redesign', status: 'submitted', progress: 100, date: '2026-03-26' },
  { id: 'r4', name: 'Elena Petrov', email: 'elena@firma.bg', project: 'Mobile App MVP', status: 'submitted', progress: 100, date: '2026-03-25' },
  { id: 'r5', name: 'Lars Andersen', email: 'lars@nordic.dk', project: 'Mobile App MVP', status: 'reviewed', progress: 100, date: '2026-03-24' },
  { id: 'r6', name: 'Anna Schmitt', email: 'anna@corp.de', project: 'Website Redesign', status: 'in_progress', progress: 35, date: '2026-03-29' },
  { id: 'r7', name: 'Jean Dupont', email: 'jean@agence.fr', project: 'Mobile App MVP', status: 'reviewed', progress: 100, date: '2026-03-22' },
];

const TEMPLATES = [
  { id: 't1', name: 'Software Requirements', sections: 4, questions: 18, uses: 12 },
  { id: 't2', name: 'Website Briefing', sections: 3, questions: 14, uses: 8 },
  { id: 't3', name: 'Mobile App Spec', sections: 5, questions: 22, uses: 5 },
  { id: 't4', name: 'API Integration', sections: 3, questions: 11, uses: 3 },
];

const NAV_ITEMS = [
  { key: 'Dashboard', href: '#', icon: LayoutDashboard },
  { key: 'Projects', href: '#', icon: FolderKanban },
  { key: 'Templates', href: '#', icon: FileText },
  { key: 'Responses', href: '#', icon: MessageSquareText },
  { key: 'Settings', href: '#', icon: Settings },
];

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  submitted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  reviewed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  archived: 'bg-orange-100 text-orange-800',
};

type View = 'dashboard' | 'projects' | 'responses' | 'templates';

export default function DemoPage() {
  const [view, setView] = useState<View>('dashboard');
  const [collapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col border-r border-border/50 bg-card/80 backdrop-blur-xl transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}>
        <div className="flex h-16 items-center border-b border-border/50 px-4">
          {collapsed ? (
            <WmcLogo variant="mark" size="sm" />
          ) : (
            <WmcLogo size="sm" showTagline />
          )}
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setSidebarCollapsed(p => !p)}>
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = (view === 'dashboard' && item.key === 'Dashboard')
              || (view === 'projects' && item.key === 'Projects')
              || (view === 'templates' && item.key === 'Templates')
              || (view === 'responses' && item.key === 'Responses');
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (item.key === 'Dashboard') setView('dashboard');
                  else if (item.key === 'Projects') setView('projects');
                  else if (item.key === 'Templates') setView('templates');
                  else if (item.key === 'Responses') setView('responses');
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[#FE0404]/10 text-[#FE0404] shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-[#FE0404]')} />
                {!collapsed && <span>{item.key}</span>}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border/50 p-3">
          <div className={cn('flex items-center gap-3 rounded-xl px-3 py-2', collapsed && 'justify-center')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FE0404]/10 text-[#FE0404] font-semibold text-xs shrink-0">PM</div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">demo@wamocon.de</p>
                <p className="text-xs text-muted-foreground">Product Owner</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Demo banner */}
        <div className="bg-gradient-to-r from-[#FE0404] to-[#CC0000] text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span>Interactive Demo — Explore the full Anforderungs Manager experience</span>
          <a href="/de/login" className="ml-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold hover:bg-white/30 transition-colors backdrop-blur-sm">
            Sign up free <ArrowRight className="h-3 w-3" />
          </a>
        </div>

        {/* Mobile nav */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-card/80 overflow-x-auto">
          {(['dashboard', 'projects', 'templates', 'responses'] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                view === v ? 'bg-[#FE0404]/10 text-[#FE0404]' : 'text-muted-foreground hover:bg-accent/50'
              )}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {view === 'dashboard' && <DashboardView onNavigate={setView} />}
          {view === 'projects' && <ProjectsView />}
          {view === 'responses' && <ResponsesView />}
          {view === 'templates' && <TemplatesView />}
        </main>
      </div>
    </div>
  );
}

/* ─────── Dashboard View ─────── */
function DashboardView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const stats = [
    { title: 'Total Projects', value: '4', icon: FolderKanban, color: 'text-blue-600', bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50', ring: 'ring-blue-200/50' },
    { title: 'Active Projects', value: '3', icon: Clock, color: 'text-emerald-600', bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50', ring: 'ring-emerald-200/50' },
    { title: 'Total Responses', value: '7', icon: MessageSquareText, color: 'text-purple-600', bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50', ring: 'ring-purple-200/50' },
    { title: 'Pending Review', value: '3', icon: FileText, color: 'text-[#FE0404]', bg: 'bg-gradient-to-br from-red-50 to-red-100/50', ring: 'ring-red-200/50' },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-slide-up">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of all projects and responses</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={stat.title} className={`group border-0 shadow-md shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm ring-1 ${stat.ring} animate-slide-up`} style={{ animationDelay: `${i * 80}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={`rounded-2xl ${stat.bg} p-3 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-0 shadow-md shadow-black/5 bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 p-1.5"><Users className="h-4 w-4 text-muted-foreground" /></div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {RESPONSES.slice(0, 5).map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 rounded-lg border p-3 hover:bg-accent/30 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FE0404]/10 text-[#FE0404] font-semibold text-sm shrink-0">
                      {r.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.project} · {new Date(r.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={statusColors[r.status] || ''}>{r.status.replace('_', ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md shadow-black/5 bg-card/80 backdrop-blur-sm">
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 hover:border-[#FE0404]/30 hover:bg-[#FE0404]/5" onClick={() => onNavigate('projects')}>
              <div className="rounded-lg bg-[#FE0404]/10 p-2"><Plus className="h-4 w-4 text-[#FE0404]" /></div>
              <div className="text-left"><p className="font-medium">Create Project</p><p className="text-xs text-muted-foreground mt-0.5">Start a new requirement collection</p></div>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 hover:border-[#FE0404]/30 hover:bg-[#FE0404]/5" onClick={() => onNavigate('templates')}>
              <div className="rounded-lg bg-purple-100 p-2"><FileText className="h-4 w-4 text-purple-600" /></div>
              <div className="text-left"><p className="font-medium">Manage Templates</p><p className="text-xs text-muted-foreground mt-0.5">Build and edit form templates</p></div>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4 hover:border-[#FE0404]/30 hover:bg-[#FE0404]/5" onClick={() => onNavigate('responses')}>
              <div className="rounded-lg bg-blue-100 p-2"><MessageSquareText className="h-4 w-4 text-blue-600" /></div>
              <div className="text-left"><p className="font-medium">View Responses</p><p className="text-xs text-muted-foreground mt-0.5">Review and export client answers</p></div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Platform highlights */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Globe, title: '25 Languages', desc: 'Forms, AI interview & voice input in your client\'s language', color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Bot, title: 'AI Interviewer', desc: 'Structured conversations with automatic follow-ups', color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: Shield, title: 'GDPR Compliant', desc: 'EU-hosted (Frankfurt), encrypted, role-based access', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(f => (
          <Card key={f.title} className="border-0 shadow-sm bg-card/60 hover:shadow-md transition-all">
            <CardContent className="p-5 flex items-start gap-4">
              <div className={cn('rounded-xl p-2.5', f.bg)}><f.icon className={cn('h-5 w-5', f.color)} /></div>
              <div><p className="font-semibold text-sm">{f.title}</p><p className="text-xs text-muted-foreground mt-1">{f.desc}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─────── Projects View ─────── */
function ProjectsView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your requirement collection projects</p>
        </div>
        <Button className="bg-[#FE0404] hover:bg-[#CC0000] text-white gap-2 shadow-md shadow-[#FE0404]/20">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((p, i) => (
          <Card key={p.id} className="group border-0 shadow-md shadow-black/5 hover:shadow-xl hover:shadow-black/10 transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm animate-slide-up cursor-pointer" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#FE0404]/10 p-2.5 group-hover:scale-110 transition-transform">
                    <FolderKanban className="h-5 w-5 text-[#FE0404]" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <Badge variant="secondary" className={statusColors[p.status] || ''}>{p.status}</Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{p.responses}/{p.total}</span>
                </div>
              </div>
              {p.total > 0 && (
                <Progress value={(p.responses / p.total) * 100} className="mt-3 h-1.5" />
              )}
              <div className="flex items-center gap-2 mt-4">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs hover:border-[#FE0404]/30">
                  <Send className="h-3 w-3" /> Invite Client
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3 w-3" /> View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─────── Responses View ─────── */
function ResponsesView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Responses</h1>
        <p className="text-muted-foreground mt-1">All client responses across projects</p>
      </div>

      <Card className="border-0 shadow-md shadow-black/5 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Respondent</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Project</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Progress</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {RESPONSES.map((r, i) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors cursor-pointer animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FE0404]/10 text-[#FE0404] font-semibold text-xs">{r.name[0]}</div>
                        <div>
                          <p className="font-medium text-sm">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{r.project}</td>
                    <td className="p-4"><Badge variant="secondary" className={statusColors[r.status] || ''}>{r.status.replace('_', ' ')}</Badge></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={r.progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{r.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{new Date(r.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Responses', value: '7', icon: MessageSquareText },
          { label: 'Submitted', value: '3', icon: FileText },
          { label: 'In Progress', value: '2', icon: Clock },
          { label: 'Reviewed', value: '2', icon: Sparkles },
        ].map((s, i) => (
          <Card key={s.label} className="border-0 shadow-sm bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2"><s.icon className="h-4 w-4 text-muted-foreground" /></div>
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─────── Templates View ─────── */
function TemplatesView() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1">Form templates for requirement collection</p>
        </div>
        <Button className="bg-[#FE0404] hover:bg-[#CC0000] text-white gap-2 shadow-md shadow-[#FE0404]/20">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t, i) => (
          <Card key={t.id} className="group border-0 shadow-md shadow-black/5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/80 backdrop-blur-sm cursor-pointer animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="rounded-xl bg-purple-50 p-2.5 group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Used {t.uses} times</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><FolderKanban className="h-3.5 w-3.5" /> {t.sections} sections</span>
                <span className="flex items-center gap-1"><MessageSquareText className="h-3.5 w-3.5" /> {t.questions} questions</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {['Short text', 'Dropdown', 'Voice'].map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">{tag}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Input types showcase */}
      <Card className="border-0 shadow-md shadow-black/5 bg-card/80">
        <CardHeader><CardTitle className="text-lg">Supported Question Types</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              'Short Text', 'Long Text', 'Dropdown', 'Multi-Select', 'Checkboxes',
              'File Upload', 'Voice Input', 'Date Picker', 'Number', 'Rating',
            ].map(qt => (
              <div key={qt} className="rounded-xl border border-border/50 p-3 text-center hover:border-[#FE0404]/30 hover:bg-[#FE0404]/5 transition-colors cursor-pointer">
                <p className="text-sm font-medium">{qt}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
