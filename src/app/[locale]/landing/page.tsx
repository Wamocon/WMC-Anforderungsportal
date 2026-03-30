import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight, Bot, CheckCircle2, ClipboardCheck, Globe, Mic,
  Shield, Sparkles, Zap, BarChart3, Users, Building2, Lightbulb,
  AlertCircle, FileX, Languages, ExternalLink, ChevronRight,
} from 'lucide-react';
import { LandingHeader } from '@/components/landing-header';
import { RevealOnScroll } from '@/components/reveal-on-scroll';
import type { Metadata } from 'next';

// ─── Bilingual copy (DE / EN — other locales fall back to EN) ─────────────────
const COPY = {
  de: {
    metaTitle: 'Anforderungs Manager – KI-gestützte Anforderungserfassung | WAMOCON',
    metaDesc: 'Sammeln Sie Kundenanforderungen in 25 Sprachen mit KI-Formularen, Spracheingabe und KI-Interview. Kein Kunden-Login nötig.',
    heroBadge: 'KI-gestützte Anforderungserfassung · WAMOCON',
    heroH1a: 'Anforderungen erfassen.',
    heroH1b: 'Ergebnisse liefern.',
    heroSub: 'Senden Sie Ihrem Kunden einen sicheren Link. Er beschreibt sein Projekt per Smart Form, Spracheingabe oder KI-Interview – in seiner eigenen Sprache. Sie erhalten strukturierte Anforderungen mit einer KI-Zusammenfassung.',
    heroCta1: 'Demo ansehen',
    heroCta2: 'Kostenlos starten',
    heroTrust: ['Kein Kunden-Login erforderlich', 'DSGVO-konform', '25 Sprachen'],
    problemBadge: 'Das Problem',
    problemH1: 'Warum traditionelle',
    problemH2: 'Anforderungserfassung scheitert',
    problemSub: 'Endlose E-Mail-Ketten, veraltete Word-Dokumente und Sprachbarrieren kosten IT-Dienstleister Tausende von Stunden im Jahr.',
    problems: [
      { icon: FileX, title: 'Unvollständige Briefings', desc: 'Kunden wissen nicht, was sie kommunizieren sollen. Ohne Führung entstehen lückenhafte Dokumente und teure Revisions-Schleifen.', stat: '68 %', statLabel: 'der Projekte scheitern an unklaren Anforderungen' },
      { icon: Languages, title: 'Sprachbarrieren', desc: 'Internationale Kunden können sich nicht vollständig auf Deutsch oder Englisch ausdrücken – kritische Details gehen verloren.', stat: '25', statLabel: 'EU-Sprachen, die kein Werkzeug vollständig unterstützt' },
      { icon: AlertCircle, title: 'Endlose Nachfragen', desc: 'Fehlende Details erzwingen mehrere Runden per E-Mail und Telefon – wochenlange Verzögerungen vor Projektstart.', stat: '43 %', statLabel: 'Mehraufwand durch Anforderungs-Schleifen' },
    ],
    featuresBadge: 'Features',
    featuresH1: 'Alles, was Sie brauchen,',
    featuresH2: 'um perfekte Anforderungen zu sammeln',
    featuresSub: 'Enterprise-Tools für IT-Beratungen in ganz Europa – die Kunden vom ersten Tag an beeindrucken.',
    howBadge: 'So funktioniert es',
    howH1: 'Drei Schritte zu',
    howH2: 'besseren Anforderungen',
    howSub: 'Von der Projekterstellung bis zur Analyse – effizient und professionell.',
    demoH1: 'Ihr Dashboard.',
    demoH2: 'Alles im Blick.',
    demoSub: 'Admins sehen alle Projekte, Fortschritt und KI-Zusammenfassungen auf einen Blick. Kunden brauchen keinen Account.',
    rolesBadge: 'Für wen',
    rolesH1: 'Gebaut für',
    rolesH2: 'professionelle IT-Teams',
    roles: [
      { icon: Building2, title: 'IT-Beratungsunternehmen', desc: 'Erfassen Sie Kundenanforderungen professionell in 25 Sprachen. Kein Raten, keine endlosen Revisions-Schleifen.', items: ['Magic-Link-Zugang', 'KI-Briefing-Analyse', 'White-Label-Option'] },
      { icon: Users, title: 'Produktmanagement-Firmen', desc: 'Begleiten Sie Discovery-Workshops digital. KI strukturiert Stakeholder-Input und leitet ihn direkt an Ihr Team weiter.', items: ['KI-Interview-Modus', 'Spracheingabe', 'Multi-Format-Export'] },
      { icon: Lightbulb, title: 'Enterprise-Digitalteams', desc: 'Standardisieren Sie interne Anforderungserfassung. DSGVO, EU-Hosting, Rollenkonzept – bereit für Corporate Compliance.', items: ['DSGVO-konform', 'EU-Hosting Frankfurt', 'Rollenbasierter Zugang'] },
    ],
    ctaH1: 'Bereit, Ihre Anforderungen',
    ctaH2: 'zu transformieren?',
    ctaDesc: 'IT-Beratungen in ganz Europa sparen mit dem Anforderungs Manager Stunden pro Projekt. Starten Sie jetzt.',
    ctaBtn: 'Jetzt loslegen',
    footerTagline: 'Professionelle Anforderungserfassung für IT-Teams.',
    sidebarNav: [
      { label: 'Dashboard', active: false }, { label: 'Projekte', active: true }, { label: 'KI-Summary', active: false }, { label: 'Kunden', active: false }, { label: 'Einstellungen', active: false },
    ],
    activeLabel: 'aktiv',
    responsesLabel: 'Antworten',
    projectsMock: [
      { name: 'Waleri Product Discovery Workshop', client: 'waleri.moretz@wamocon.com', progress: 72, status: 'Aktiv', responses: 3 },
      { name: 'ERP Migration Anforderungen', client: 'kunde@example.de', progress: 45, status: 'In Bearbeitung', responses: 1 },
      { name: 'Kundenportal Redesign', client: 'team@enterprise.com', progress: 90, status: 'Abgeschlossen', responses: 5 },
    ],
  },
  en: {
    metaTitle: 'Requirement Manager – AI-powered Requirement Collection | WAMOCON',
    metaDesc: 'Collect client requirements in 25 languages using AI forms, voice input, and AI interviews. No client login required.',
    heroBadge: 'AI-powered requirement collection · WAMOCON',
    heroH1a: 'Collect requirements.',
    heroH1b: 'Deliver results.',
    heroSub: 'Simply send your client a secure link. They describe their project via smart forms, voice input, or an AI interview — in their own language. You receive structured requirements with an AI executive summary.',
    heroCta1: 'View demo',
    heroCta2: 'Start for free',
    heroTrust: ['No client login required', 'GDPR compliant', '25 languages'],
    problemBadge: 'The Problem',
    problemH1: 'Why traditional',
    problemH2: 'requirement collection fails',
    problemSub: 'Endless email chains, outdated Word documents, and language barriers cost IT consultancies thousands of hours per year.',
    problems: [
      { icon: FileX, title: 'Incomplete Briefings', desc: "Clients don't know what to communicate. Without guidance, incomplete documents lead to expensive revision loops.", stat: '68%', statLabel: 'of projects fail due to unclear requirements' },
      { icon: Languages, title: 'Language Barriers', desc: 'International clients cannot fully express themselves in German or English — critical details get lost in translation.', stat: '25', statLabel: 'EU languages no tool fully supports' },
      { icon: AlertCircle, title: 'Endless Follow-ups', desc: 'Missing details force multiple rounds of emails and calls — weeks of delays before a project can even start.', stat: '43%', statLabel: 'extra effort caused by requirement loops' },
    ],
    featuresBadge: 'Features',
    featuresH1: 'Everything you need to collect',
    featuresH2: 'perfect requirements',
    featuresSub: 'Enterprise-ready tools designed for IT consultancies across Europe who want to impress clients from day one.',
    howBadge: 'How It Works',
    howH1: 'Three steps to',
    howH2: 'better requirements',
    howSub: 'From project creation to analysis — effortless and professional.',
    demoH1: 'Your dashboard.',
    demoH2: 'Fully in view.',
    demoSub: 'Admins see all projects, progress, and AI summaries at a glance. Clients need no account.',
    rolesBadge: "Who It's For",
    rolesH1: 'Built for',
    rolesH2: 'professional IT teams',
    roles: [
      { icon: Building2, title: 'IT Consultancies', desc: 'Collect client requirements professionally in 25 languages. No guessing, no endless revision loops.', items: ['Magic link access', 'AI briefing analysis', 'White-label option'] },
      { icon: Users, title: 'Product Management Firms', desc: 'Run digital discovery workshops. AI structures stakeholder input and forwards it directly to your team.', items: ['AI interview mode', 'Voice input', 'Multi-format export'] },
      { icon: Lightbulb, title: 'Enterprise Digital Teams', desc: 'Standardize internal requirement collection. GDPR, EU hosting, role-based access — ready for corporate compliance.', items: ['GDPR compliant', 'EU hosting Frankfurt', 'Role-based access'] },
    ],
    ctaH1: 'Ready to transform how you',
    ctaH2: 'collect requirements?',
    ctaDesc: 'IT consultancies across Europe save hours on every project with Requirement Manager. Start now.',
    ctaBtn: 'Start collecting now',
    footerTagline: 'Professional requirement collection for IT teams.',
    sidebarNav: [
      { label: 'Dashboard', active: false }, { label: 'Projects', active: true }, { label: 'AI Summary', active: false }, { label: 'Clients', active: false }, { label: 'Settings', active: false },
    ],
    activeLabel: 'active',
    responsesLabel: 'responses',
    projectsMock: [
      { name: 'Waleri Product Discovery Workshop', client: 'waleri.moretz@wamocon.com', progress: 72, status: 'Active', responses: 3 },
      { name: 'ERP Migration Requirements', client: 'client@example.com', progress: 45, status: 'In progress', responses: 1 },
      { name: 'Customer Portal Redesign', client: 'team@enterprise.com', progress: 90, status: 'Completed', responses: 5 },
    ],
  },
} as const;

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const c = locale === 'de' ? COPY.de : COPY.en;
  return { title: c.metaTitle, description: c.metaDesc };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const c = locale === 'de' ? COPY.de : COPY.en;

  const features = [
    { icon: ClipboardCheck, title: t('landing.smartForms'),        desc: t('landing.smartFormsDesc'),        gradient: 'from-blue-500 to-cyan-500',     border: 'hover:border-blue-500/40',    shadow: 'hover:shadow-blue-500/15' },
    { icon: Mic,            title: t('landing.voiceInput'),        desc: t('landing.voiceInputDesc'),        gradient: 'from-violet-500 to-purple-500', border: 'hover:border-violet-500/40',  shadow: 'hover:shadow-violet-500/15' },
    { icon: Bot,            title: t('landing.aiInterviewer'),     desc: t('landing.aiInterviewerDesc'),     gradient: 'from-[#FE0404] to-orange-500',  border: 'hover:border-[#FE0404]/40',   shadow: 'hover:shadow-[#FE0404]/15' },
    { icon: Globe,          title: t('landing.multiLanguage'),     desc: t('landing.multiLanguageDesc'),     gradient: 'from-emerald-500 to-teal-500',  border: 'hover:border-emerald-500/40', shadow: 'hover:shadow-emerald-500/15' },
    { icon: Shield,         title: t('landing.gdprCompliant'),     desc: t('landing.gdprCompliantDesc'),     gradient: 'from-amber-500 to-yellow-500',  border: 'hover:border-amber-500/40',   shadow: 'hover:shadow-amber-500/15' },
    { icon: BarChart3,      title: t('landing.realtimeDashboard'), desc: t('landing.realtimeDashboardDesc'), gradient: 'from-pink-500 to-rose-500',     border: 'hover:border-pink-500/40',    shadow: 'hover:shadow-pink-500/15' },
  ];

  const steps = [
    { step: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc'), icon: ClipboardCheck },
    { step: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc'), icon: ExternalLink },
    { step: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc'), icon: Sparkles },
  ];

  const stats = [
    { value: '25',      label: t('landing.languagesSupported'), icon: Globe },
    { value: '100 %',   label: t('landing.gdprCompliant'),      icon: Shield },
    { value: '< 5 min', label: t('landing.setupTime'),          icon: Zap },
    { value: '24 / 7',  label: t('landing.aiAvailable'),        icon: Bot },
  ];

  const ticker = [...Array(3)].flatMap(() => [
    'WAMOCON', locale === 'de' ? 'KI-FORMULARE' : 'AI FORMS',
    '25 ' + (locale === 'de' ? 'SPRACHEN' : 'LANGUAGES'),
    locale === 'de' ? 'SPRACHEINGABE' : 'VOICE INPUT',
    locale === 'de' ? 'KI-INTERVIEWER' : 'AI INTERVIEWER',
    'DSGVO / GDPR', 'MAGIC LINKS',
    locale === 'de' ? 'KI-ZUSAMMENFASSUNG' : 'AI SUMMARY',
    locale === 'de' ? 'ECHTZEIT-DASHBOARD' : 'REAL-TIME DASHBOARD',
    'MADE IN GERMANY',
  ]);

  const sidebarIcons = [BarChart3, ClipboardCheck, Sparkles, Users, Shield];

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <LandingHeader />

      <main className="flex-1">

        {/* ═══ HERO ═══════════════════════════════════════════════════════ */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-10 left-8   h-80 w-80 rounded-full bg-[#FE0404]/10 blur-3xl animate-pulse-glow" />
            <div className="absolute bottom-10 right-8 h-96 w-96 rounded-full bg-blue-500/8 blur-3xl animate-pulse-glow" style={{ animationDelay: '2.5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-gradient-to-br from-[#FE0404]/4 to-purple-500/4 blur-3xl animate-pulse-glow" style={{ animationDelay: '5s' }} />
            <div className="absolute inset-0 [background-image:radial-gradient(rgba(0,0,0,0.08)_1px,transparent_1px)] dark:[background-image:radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
          </div>

          <div className="container relative mx-auto px-4 sm:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <div className="animate-slide-up inline-flex items-center gap-2 rounded-full border border-[#FE0404]/25 bg-card/70 px-5 py-2 text-sm font-semibold text-[#FE0404] shadow-sm backdrop-blur-md mb-8">
                <Sparkles className="h-4 w-4" />
                {c.heroBadge}
              </div>

              <h1 className="animate-slide-up stagger-1 text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[1.06]">
                <span className="bg-gradient-to-br from-foreground via-foreground/85 to-foreground/60 bg-clip-text text-transparent">
                  {c.heroH1a}
                </span>
                <br />
                <span className="bg-gradient-to-r from-[#FE0404] via-[#FF4444] to-[#CC0000] bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
                  {c.heroH1b}
                </span>
              </h1>

              <p className="animate-slide-up stagger-2 mt-7 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                {c.heroSub}
              </p>

              <div className="animate-slide-up stagger-3 mt-11 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/login">
                  <Button size="lg" className="gap-2 h-14 px-12 text-base font-bold rounded-xl bg-[#FE0404] hover:bg-[#C80000] text-white shadow-2xl shadow-[#FE0404]/25 hover:shadow-[#FE0404]/40 hover:-translate-y-0.5 transition-all duration-300">
                    {c.heroCta2}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="#demo">
                  <Button variant="outline" size="lg" className="gap-2 h-14 px-10 text-base font-semibold rounded-xl border-border/60 hover:bg-accent/60 hover:-translate-y-0.5 transition-all duration-300">
                    {c.heroCta1}
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="animate-slide-up stagger-4 mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
                {c.heroTrust.map((label) => (
                  <span key={label} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ TICKER ══════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden border-y border-border/50 bg-muted/30 py-3.5">
          <div
            className="flex gap-10 whitespace-nowrap"
            style={{ animation: 'ticker 40s linear infinite', width: 'max-content' }}
          >
            {ticker.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-3 text-[11px] font-bold tracking-[0.18em] text-muted-foreground/70 uppercase">
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#FE0404]" />
                {item}
              </span>
            ))}
          </div>
          <style>{`@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}`}</style>
        </div>

        {/* ═══ STATS ═══════════════════════════════════════════════════════ */}
        <RevealOnScroll>
          <section className="border-b bg-gradient-to-br from-muted/20 via-background to-muted/20 py-16 sm:py-20">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
                {stats.map((stat, i) => (
                  <div key={stat.label} className={`animate-slide-up stagger-${i + 1} text-center group cursor-default`}>
                    <div className="inline-flex items-center justify-center rounded-2xl bg-[#FE0404]/10 dark:bg-[#FE0404]/15 p-3.5 mb-4 transition-all duration-300 group-hover:bg-[#FE0404] group-hover:shadow-xl group-hover:shadow-[#FE0404]/25 group-hover:scale-110">
                      <stat.icon className="h-6 w-6 text-[#FE0404] transition-colors duration-300 group-hover:text-white" />
                    </div>
                    <p className="text-3xl sm:text-4xl font-black text-foreground tabular-nums">{stat.value}</p>
                    <p className="mt-1.5 text-sm font-medium text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* ═══ PROBLEM (dark) ══════════════════════════════════════════════ */}
        <RevealOnScroll delay={100}>
          <section className="relative overflow-hidden bg-[#08080a] dark:bg-[#040406] py-24 sm:py-32">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-1/2 h-72 w-2/3 -translate-x-1/2 rounded-full bg-[#FE0404]/7 blur-3xl" />
              <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-blue-900/10 blur-3xl" />
            </div>

            <div className="container relative mx-auto px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center mb-16">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#FE0404]/30 bg-[#FE0404]/10 px-4 py-1.5 text-sm font-bold text-[#FE0404] uppercase tracking-widest mb-6">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {c.problemBadge}
                </div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.1]" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  {c.problemH1}{' '}<span className="text-[#FE0404]">{c.problemH2}</span>
                </h2>
                <p className="mt-5 text-gray-400 text-lg leading-relaxed">{c.problemSub}</p>
              </div>

              <div className="grid sm:grid-cols-3 gap-6">
                {c.problems.map((problem, i) => (
                  <div
                    key={problem.title}
                    className={`animate-slide-up stagger-${i + 1} group relative rounded-2xl border border-white/8 bg-white/[0.03] p-8 hover:border-[#FE0404]/40 hover:bg-white/[0.05] transition-all duration-500`}
                  >
                    <div className="mb-6 inline-flex items-center justify-center rounded-xl border border-[#FE0404]/20 bg-[#FE0404]/10 p-3">
                      <problem.icon className="h-6 w-6 text-[#FE0404]" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white">{problem.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-8">{problem.desc}</p>
                    <div className="border-t border-white/10 pt-5">
                      <span className="block text-4xl font-black text-[#FE0404] tabular-nums">{problem.stat}</span>
                      <span className="mt-1 block text-xs text-gray-500 leading-relaxed">{problem.statLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* ═══ FEATURES ════════════════════════════════════════════════════ */}
        <RevealOnScroll delay={100}>
          <section className="py-24 sm:py-32" id="features">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center mb-16">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-1.5 text-sm font-medium text-muted-foreground mb-4">
                  <Zap className="h-3.5 w-3.5 text-[#FE0404]" />
                  {c.featuresBadge}
                </div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
                  {c.featuresH1}<br /><span className="text-[#FE0404]">{c.featuresH2}</span>
                </h2>
                <p className="mt-5 text-muted-foreground text-lg leading-relaxed">{c.featuresSub}</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feat, i) => (
                  <Card
                    key={feat.title}
                    className={`animate-slide-up stagger-${(i % 3) + 1} group border transition-all duration-500 cursor-default hover:-translate-y-1.5 ${feat.border} hover:shadow-2xl ${feat.shadow}`}
                  >
                    <CardContent className="p-7">
                      <div className={`mb-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${feat.gradient} p-3 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                        <feat.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="mb-2.5 text-lg font-bold">{feat.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* ═══ HOW IT WORKS ════════════════════════════════════════════════ */}
        <RevealOnScroll delay={100}>
          <section className="border-y bg-gradient-to-br from-muted/30 via-background to-muted/30 py-24 sm:py-32">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center mb-16">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-1.5 text-sm font-medium text-muted-foreground mb-4">
                  <Sparkles className="h-3.5 w-3.5 text-[#FE0404]" />
                  {c.howBadge}
                </div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
                  {c.howH1}<br /><span className="text-[#FE0404]">{c.howH2}</span>
                </h2>
                <p className="mt-5 text-muted-foreground text-lg">{c.howSub}</p>
              </div>

              <div className="relative mx-auto max-w-5xl">
                <div className="hidden lg:block absolute top-11 left-[18%] right-[18%] h-px bg-gradient-to-r from-transparent via-border to-transparent pointer-events-none" />
                <div className="grid lg:grid-cols-3 gap-12 lg:gap-8">
                  {steps.map((step, i) => (
                    <div key={step.step} className={`animate-slide-up stagger-${i + 1} text-center group`}>
                      <div className="relative inline-block">
                        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-3xl bg-[#FE0404] shadow-2xl shadow-[#FE0404]/30 mx-auto transition-all duration-300 group-hover:scale-110 group-hover:shadow-[#FE0404]/50">
                          <step.icon className="h-10 w-10 text-white" />
                        </div>
                        <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-foreground text-background text-xs font-black shadow-md">
                          {step.step}
                        </span>
                      </div>
                      <h3 className="mt-6 text-xl font-bold">{step.title}</h3>
                      <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed max-w-[240px] mx-auto">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* ═══ DEMO PREVIEW (dark) ═════════════════════════════════════════ */}
        <RevealOnScroll delay={100}>
          <section className="relative overflow-hidden bg-[#08080a] dark:bg-[#040406] py-24 sm:py-32" id="demo">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[#FE0404]/6 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-blue-900/8 blur-3xl" />
            </div>

            <div className="container relative mx-auto px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center mb-14">
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.1]">
                  {c.demoH1}{' '}<span className="text-[#FE0404]">{c.demoH2}</span>
                </h2>
                <p className="mt-5 text-gray-400 text-lg">{c.demoSub}</p>
              </div>

              <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_80px_rgba(254,4,4,0.12)]">
                {/* Window chrome */}
                <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="h-3 w-3 rounded-full bg-[#FE0404]/80" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <div className="ml-4 flex h-6 max-w-sm flex-1 items-center gap-2 rounded-md bg-white/[0.06] px-3">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span className="font-mono text-[10px] text-gray-500 truncate">
                      anforderungsportal.de/{locale}/projects
                    </span>
                  </div>
                </div>

                <div className="grid lg:grid-cols-[200px_1fr] min-h-[400px]">
                  {/* Sidebar */}
                  <aside className="hidden lg:block border-r border-white/8 bg-white/[0.02] p-4 space-y-1">
                    {c.sidebarNav.map((item, i) => {
                      const Icon = sidebarIcons[i] ?? BarChart3;
                      return (
                        <div
                          key={item.label}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${item.active ? 'bg-[#FE0404]/20 text-[#FE0404] font-semibold' : 'text-gray-600 hover:text-gray-300'}`}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {item.label}
                        </div>
                      );
                    })}
                  </aside>

                  {/* Main panel */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">
                        {locale === 'de' ? 'Aktive Projekte' : 'Active Projects'}
                      </h3>
                      <span className="rounded-full border border-[#FE0404]/30 bg-[#FE0404]/15 px-3 py-1 text-[11px] font-bold text-[#FE0404] uppercase tracking-wider">
                        3 {c.activeLabel}
                      </span>
                    </div>

                    {c.projectsMock.map((project) => (
                      <div
                        key={project.name}
                        className="group rounded-xl border border-white/8 bg-white/[0.03] p-4 hover:border-[#FE0404]/30 hover:bg-white/[0.05] transition-all duration-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white group-hover:text-[#FE0404] transition-colors">{project.name}</p>
                            <p className="mt-0.5 truncate text-xs text-gray-600">{project.client}</p>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2.5">
                            <span className="text-xs text-gray-600">{project.responses} {c.responsesLabel}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${project.progress >= 85 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#FE0404]/15 text-[#FE0404]'}`}>
                              {project.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#FE0404] to-orange-400 transition-all duration-700"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-[10px] text-gray-600">
                            {locale === 'de' ? 'Fortschritt' : 'Progress'}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500">{project.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* ═══ ROLES ═══════════════════════════════════════════════════════ */}
        <RevealOnScroll delay={100}>
          <section className="py-24 sm:py-32">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="mx-auto max-w-3xl text-center mb-16">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-1.5 text-sm font-medium text-muted-foreground mb-4">
                  <Users className="h-3.5 w-3.5 text-[#FE0404]" />
                  {c.rolesBadge}
                </div>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
                  {c.rolesH1}{' '}<span className="text-[#FE0404]">{c.rolesH2}</span>
                </h2>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {c.roles.map((role, i) => (
                  <div
                    key={role.title}
                    className={`animate-slide-up stagger-${i + 1} group rounded-2xl border bg-gradient-to-br from-card to-card/60 p-8 hover:border-[#FE0404]/40 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#FE0404]/10 transition-all duration-500`}
                  >
                    <div className="mb-5 inline-flex items-center justify-center rounded-xl bg-[#FE0404]/10 dark:bg-[#FE0404]/15 p-3.5 transition-all duration-300 group-hover:bg-[#FE0404] group-hover:shadow-xl group-hover:shadow-[#FE0404]/30 group-hover:scale-110">
                      <role.icon className="h-7 w-7 text-[#FE0404] transition-colors duration-300 group-hover:text-white" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold">{role.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-7">{role.desc}</p>
                    <ul className="space-y-2.5">
                      {role.items.map((item) => (
                        <li key={item} className="flex items-center gap-2.5 text-sm font-medium">
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#FE0404]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* ═══ CTA ═════════════════════════════════════════════════════════ */}
        <RevealOnScroll delay={100}>
          <section className="relative overflow-hidden border-t py-24 sm:py-32">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FE0404]/5 via-transparent to-transparent" />
              <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#FE0404]/10 blur-3xl animate-pulse-glow" />
              <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-blue-500/6 blur-3xl animate-pulse-glow" style={{ animationDelay: '3s' }} />
            </div>

            <div className="container relative mx-auto px-4 sm:px-6 text-center">
              <div className="mx-auto max-w-3xl">
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                  {c.ctaH1}<br />
                  <span className="bg-gradient-to-r from-[#FE0404] via-[#FF4444] to-orange-500 bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
                    {c.ctaH2}
                  </span>
                </h2>
                <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">{c.ctaDesc}</p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/login">
                    <Button size="lg" className="gap-2 h-14 px-14 text-base font-bold rounded-xl bg-[#FE0404] hover:bg-[#C80000] text-white shadow-2xl shadow-[#FE0404]/30 hover:shadow-[#FE0404]/50 hover:-translate-y-0.5 transition-all duration-300">
                      {c.ctaBtn}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>

                <div className="mt-9 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
                  {c.heroTrust.map((label) => (
                    <span key={label} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* ═══ FOOTER ══════════════════════════════════════════════════════ */}
        <footer className="border-t bg-muted/15 py-10">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FE0404] shadow-lg shadow-[#FE0404]/30">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-foreground">
                    {locale === 'de' ? 'Anforderungs Manager' : 'Requirement Manager'}
                  </span>
                  <span className="ml-1.5 text-muted-foreground/70">by WAMOCON</span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <Link href="/login" className="hover:text-foreground transition-colors font-medium">
                  {locale === 'de' ? 'Anmelden' : 'Sign In'}
                </Link>
                <span className="text-border">·</span>
                <span className="text-muted-foreground/60">{c.footerTagline}</span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
