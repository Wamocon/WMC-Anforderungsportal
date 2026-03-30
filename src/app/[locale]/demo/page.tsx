'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  MessageSquareText,
  Users,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  Mic,
  Bot,
  ClipboardList,
  ChevronRight,
  CheckCircle2,
  Upload,
} from 'lucide-react';

type View = 'manager' | 'client';

export default function DemoPage() {
  const [view, setView] = useState<View>('manager');

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Top bar with toggle */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FE0404] text-white">
            <ClipboardList className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm hidden sm:block">Anforderungs Manager</span>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1">
          <button
            onClick={() => setView('manager')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              view === 'manager'
                ? 'bg-white text-[#FE0404] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Manager</span>
          </button>
          <button
            onClick={() => setView('client')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              view === 'client'
                ? 'bg-white text-[#FE0404] shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Client Form</span>
          </button>
        </div>

        <Link
          href="/de/login"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#FE0404] px-4 py-2 text-sm font-medium text-white hover:bg-[#CC0000] transition-colors"
        >
          Sign up <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {view === 'manager' ? <ManagerView /> : <ClientFormView />}
      </main>
    </div>
  );
}

/* ─────── Manager Dashboard View ─────── */
function ManagerView() {
  const stats = [
    { title: 'Projects', value: '4', icon: FolderKanban, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Active', value: '3', icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Responses', value: '9', icon: MessageSquareText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Pending', value: '3', icon: FileText, color: 'text-[#FE0404]', bg: 'bg-red-50' },
  ];

  const projects = [
    { name: 'Website Redesign', status: 'active', responses: 3, total: 5 },
    { name: 'CRM Integration', status: 'active', responses: 1, total: 3 },
    { name: 'Mobile App MVP', status: 'active', responses: 5, total: 5 },
    { name: 'ERP Migration', status: 'draft', responses: 0, total: 0 },
  ];

  const activity = [
    { name: 'Thomas Mueller', project: 'Website Redesign', status: 'submitted', date: '28. Mär' },
    { name: 'Sarah König', project: 'CRM Integration', status: 'in progress', date: '27. Mär' },
    { name: 'Marc Bauer', project: 'Website Redesign', status: 'submitted', date: '26. Mär' },
    { name: 'Elena Petrov', project: 'Mobile App MVP', status: 'reviewed', date: '25. Mär' },
  ];

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-muted text-muted-foreground',
    submitted: 'bg-emerald-100 text-emerald-800',
    'in progress': 'bg-blue-100 text-blue-800',
    reviewed: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.title} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('rounded-xl p-2.5', s.bg)}>
                <s.icon className={cn('h-5 w-5', s.color)} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Projects list */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Projects</CardTitle>
              <Button size="sm" className="bg-[#FE0404] hover:bg-[#CC0000] text-white gap-1 h-8 text-xs">
                <Plus className="h-3.5 w-3.5" /> New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.map((p) => (
              <div key={p.name} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#FE0404]/10 p-2">
                    <FolderKanban className="h-4 w-4 text-[#FE0404]" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.total > 0 ? `${p.responses}/${p.total} responses` : 'No responses yet'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className={statusColor[p.status]}>{p.status}</Badge>
                  {p.total > 0 && (
                    <div className="w-16 hidden sm:block">
                      <Progress value={(p.responses / p.total) * 100} className="h-1.5" />
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity.map((a) => (
              <div key={a.name} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FE0404]/10 text-[#FE0404] font-semibold text-xs shrink-0">
                    {a.name[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.project} · {a.date}</p>
                  </div>
                </div>
                <Badge variant="secondary" className={cn('text-xs shrink-0', statusColor[a.status])}>{a.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─────── Client Form View ─────── */
function ClientFormView() {
  const [currentSection, setCurrentSection] = useState(0);
  const sections = ['Basic Info', 'Technical Req.', 'Budget & Timeline'];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Form header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Website Redesign</h1>
          <p className="text-sm text-muted-foreground">Requirements Questionnaire</p>
        </div>
        <Badge className="bg-green-100 text-green-800 gap-1">
          <Sparkles className="h-3 w-3" /> AI-Assisted
        </Badge>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Section {currentSection + 1} of {sections.length}</span>
          <span className="font-medium">{Math.round(((currentSection + 1) / sections.length) * 100)}%</span>
        </div>
        <Progress value={((currentSection + 1) / sections.length) * 100} className="h-2" />
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((s, i) => (
          <button
            key={s}
            onClick={() => setCurrentSection(i)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              i === currentSection
                ? 'bg-[#FE0404]/10 text-[#FE0404]'
                : i < currentSection
                  ? 'bg-green-50 text-green-700'
                  : 'bg-muted text-muted-foreground'
            )}
          >
            {i < currentSection && <CheckCircle2 className="h-3.5 w-3.5" />}
            <span>{i + 1}. {s}</span>
          </button>
        ))}
      </div>

      {/* Form content */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 space-y-5">
          {currentSection === 0 && (
            <>
              <FormField label="Project Name" placeholder="e.g. Website Redesign 2026" value="Website Redesign 2026" />
              <FormField label="Company / Organization" placeholder="Your company name" value="ACME GmbH" />
              <FormTextarea
                label="Describe your project goals"
                placeholder="What do you want to achieve?"
                value="We want to redesign our corporate website to improve conversion rates and modernize the user experience. The current site is 4 years old and doesn't reflect our brand anymore."
              />
              {/* AI follow-up */}
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-purple-100 p-1.5 mt-0.5">
                    <Bot className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-900">AI Follow-up</p>
                    <p className="text-sm text-purple-700 mt-1">
                      Could you specify which conversion metrics you&apos;re targeting? (e.g., form submissions, signups, purchases)
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        className="flex-1 rounded-md border border-purple-200 bg-white px-3 py-1.5 text-sm placeholder:text-muted-foreground"
                        placeholder="Type your answer..."
                        defaultValue="Contact form submissions and demo requests"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <FormField label="Target audience" placeholder="Who are your users?" value="B2B decision makers, CTOs, and IT managers" />
            </>
          )}

          {currentSection === 1 && (
            <>
              <FormField label="Current tech stack" placeholder="e.g. WordPress, React..." value="WordPress 5.x with custom theme" />
              <FormTextarea
                label="Technical requirements"
                placeholder="Any specific technical needs?"
                value="Must integrate with our Salesforce CRM and HubSpot. Need SSO via Azure AD. Mobile-first responsive design required."
              />
              <div>
                <label className="text-sm font-medium mb-2 block">Preferred technologies</label>
                <div className="flex flex-wrap gap-2">
                  {['React / Next.js', 'Vue.js', 'WordPress', 'Custom CMS', 'Headless'].map((t, i) => (
                    <span
                      key={t}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-colors',
                        i === 0
                          ? 'bg-[#FE0404]/10 border-[#FE0404]/30 text-[#FE0404] font-medium'
                          : 'border-border hover:border-[#FE0404]/30 text-muted-foreground'
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              {/* Voice input hint */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <Mic className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Voice Input Available</p>
                  <p className="text-xs text-muted-foreground">Click the microphone on any field to dictate your answer</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Upload existing documents</label>
                <div className="rounded-lg border-2 border-dashed border-border p-6 text-center hover:border-[#FE0404]/30 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drop files here or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, Word, Images up to 10MB</p>
                </div>
              </div>
            </>
          )}

          {currentSection === 2 && (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Budget range</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['< €10k', '€10k–25k', '€25k–50k', '€50k+'].map((b, i) => (
                    <span
                      key={b}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm text-center border cursor-pointer transition-colors',
                        i === 2
                          ? 'bg-[#FE0404]/10 border-[#FE0404]/30 text-[#FE0404] font-medium'
                          : 'border-border hover:border-[#FE0404]/30 text-muted-foreground'
                      )}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
              <FormField label="Desired launch date" placeholder="e.g. Q3 2026" value="September 2026" />
              <FormTextarea
                label="Any additional notes?"
                placeholder="Anything else we should know..."
                value="We have a brand guide ready. Previous analytics data available for review."
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
          disabled={currentSection === 0}
        >
          Back
        </Button>
        <Button
          className="bg-[#FE0404] hover:bg-[#CC0000] text-white gap-1"
          onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
        >
          {currentSection === sections.length - 1 ? 'Submit' : 'Next'} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ─────── Reusable form fields ─────── */
function FormField({ label, placeholder, value }: { label: string; placeholder: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <input
        type="text"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
        placeholder={placeholder}
        defaultValue={value}
      />
    </div>
  );
}

function FormTextarea({ label, placeholder, value }: { label: string; placeholder: string; value: string }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <textarea
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground min-h-[80px] resize-none"
        placeholder={placeholder}
        defaultValue={value}
      />
    </div>
  );
}
