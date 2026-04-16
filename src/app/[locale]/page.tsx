import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowRight,
  ClipboardCheck,
  Globe,
  Mic,
  Shield,
  Bot,
  Zap,
  BarChart3,
  Sparkles,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { WmcLogo } from '@/components/wmc-logo';
import { LandingHeader } from '@/components/landing-header';
import { RevealOnScroll } from '@/components/reveal-on-scroll';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();

  const features = [
    {
      icon: ClipboardCheck,
      title: t('landing.smartForms'),
      description: t('landing.smartFormsDesc'),
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Mic,
      title: t('landing.voiceInput'),
      description: t('landing.voiceInputDesc'),
      gradient: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-500/10',
    },
    {
      icon: Bot,
      title: t('landing.aiInterviewer'),
      description: t('landing.aiInterviewerDesc'),
      gradient: 'from-[#FE0404] to-orange-500',
      bg: 'bg-[#FE0404]/10',
    },
    {
      icon: Globe,
      title: t('landing.multiLanguage'),
      description: t('landing.multiLanguageDesc'),
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: Shield,
      title: t('landing.gdprCompliant'),
      description: t('landing.gdprCompliantDesc'),
      gradient: 'from-amber-500 to-yellow-500',
      bg: 'bg-amber-500/10',
    },
    {
      icon: BarChart3,
      title: t('landing.realtimeDashboard'),
      description: t('landing.realtimeDashboardDesc'),
      gradient: 'from-pink-500 to-rose-500',
      bg: 'bg-pink-500/10',
    },
    {
      icon: Terminal,
      title: t('landing.mcpIntegration'),
      description: t('landing.mcpIntegrationDesc'),
      gradient: 'from-indigo-500 to-violet-500',
      bg: 'bg-indigo-500/10',
    },
  ];

  const stats = [
    { value: '25', label: t('landing.languagesSupported'), icon: Globe },
    { value: '100%', label: t('landing.gdprCompliant'), icon: Shield },
    { value: '< 5min', label: t('landing.setupTime'), icon: Zap },
    { value: '24/7', label: t('landing.aiAvailable'), icon: Bot },
  ];

  const steps = [
    { step: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { step: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { step: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
  ];

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-white dark:bg-background">
      {/* Header */}
      <LandingHeader />

      <main className="flex-1">
        {/* ══════════ HERO ══════════ */}
        <section className="relative min-h-[92vh] flex items-center overflow-hidden">
          {/* White base with gradient glow orbs */}
          <div className="absolute inset-0 bg-white dark:bg-background" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] pointer-events-none" />
          {/* Radial fade mask for grid */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,white_70%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_30%,hsl(var(--background))_70%)] pointer-events-none" />
          {/* Top-left warm glow */}
          <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full bg-[#FE0404]/[0.07] blur-[120px] dark:bg-[#FE0404]/[0.04]" />
          {/* Top-right blue accent */}
          <div className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full bg-blue-400/[0.06] blur-[100px] dark:bg-blue-500/[0.03]" />
          {/* Bottom ambient */}
          <div className="absolute bottom-0 left-1/3 w-[600px] h-[400px] rounded-full bg-rose-200/[0.08] blur-[100px] dark:bg-rose-500/[0.03]" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Content */}
              <div className="max-w-2xl">
                {/* Glass badge */}
                <div className="animate-slide-up inline-flex items-center gap-2 rounded-full liquid-glass-badge px-4 py-2 text-sm font-medium shadow-sm mb-8">
                  <Sparkles className="h-4 w-4 text-[#FE0404]" />
                  <span className="text-foreground/70">{t('common.poweredBy')}</span>
                </div>

                {/* Heading */}
                <h1 className="animate-slide-up stagger-1 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold tracking-[-0.03em] leading-[1.05]">
                  <span className="text-foreground">
                    {t('landing.heroTitle1')}
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-[#FE0404] via-[#FF3333] to-[#FF6B6B] bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
                    {t('landing.heroTitle2')}
                  </span>
                </h1>

                {/* Subheading */}
                <p className="animate-slide-up stagger-2 mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl tracking-[-0.01em]">
                  {t('landing.heroSubtitleFull')}
                </p>

                {/* CTA Buttons */}
                <div className="animate-slide-up stagger-3 flex flex-col sm:flex-row items-start gap-4 mt-10">
                  <Link href="/login">
                    <Button size="lg" className="liquid-glass-cta bg-[#FE0404]/80 backdrop-blur-[2px] hover:bg-[#FE0404] text-white gap-2 h-14 px-10 text-base font-semibold rounded-2xl shadow-xl shadow-[#FE0404]/20 hover:shadow-2xl hover:shadow-[#FE0404]/30 hover:scale-[1.02] transition-all duration-300">
                      {t('landing.getStarted')}
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/25">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="liquid-glass-btn gap-2 h-14 px-10 text-base font-semibold rounded-2xl border-black/[0.08] dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl text-foreground hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 shadow-sm">
                      <Bot className="h-5 w-5 text-[#FE0404]" />
                      {t('landing.tryAiInterview')}
                    </Button>
                  </Link>
                </div>

                {/* Trust indicators */}
                <div className="animate-slide-up stagger-4 mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {t('landing.noCreditCard')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {t('landing.gdprReady')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    {t('landing.langCount')}
                  </span>
                </div>
              </div>

              {/* Right: Glass orb / visual */}
              <div className="relative hidden lg:flex items-center justify-center">
                <div className="relative w-[480px] h-[480px]">
                  {/* Glowing outer ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FE0404]/20 via-transparent to-blue-400/10 animate-pulse-glow" />
                  {/* Glass sphere */}
                  <div className="absolute inset-6 rounded-full liquid-glass-orb overflow-hidden">
                    {/* Inner gradient mesh */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#FE0404]/10 via-white/60 to-blue-100/30 dark:from-[#FE0404]/15 dark:via-background/60 dark:to-blue-900/20" />
                    {/* Highlight arc top */}
                    <div className="absolute top-4 left-8 right-8 h-24 rounded-full bg-white/40 dark:bg-white/10 blur-xl" />
                    {/* Inner content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 gap-3">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FE0404] to-[#CC0000] flex items-center justify-center shadow-lg shadow-[#FE0404]/20">
                        <ClipboardCheck className="h-10 w-10 text-white" />
                      </div>
                      <p className="text-xl font-bold text-foreground">AI-Powered</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">Requirements Collection<br />in 25 Languages</p>
                    </div>
                    {/* Subtle inner noise */}
                    <div className="absolute inset-0 grain-overlay opacity-20 rounded-full" />
                  </div>
                  {/* Floating mini-cards */}
                  <div className="absolute -top-2 right-8 liquid-glass-float-card animate-float px-4 py-2.5 rounded-xl shadow-lg">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-violet-500" />
                      <span className="text-xs font-semibold text-foreground">Voice Input</span>
                    </div>
                  </div>
                  <div className="absolute bottom-8 -left-4 liquid-glass-float-card animate-float-delay px-4 py-2.5 rounded-xl shadow-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-foreground">25 Languages</span>
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-4 liquid-glass-float-card animate-float-slow px-4 py-2.5 rounded-xl shadow-lg">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-500" />
                      <span className="text-xs font-semibold text-foreground">GDPR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* ══════════ STATS ══════════ */}
        <RevealOnScroll>
        <section className="relative bg-white dark:bg-background overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-[0.25] dark:opacity-40 pointer-events-none" />
          <div className="container mx-auto px-4 sm:px-6 py-16 sm:py-20 relative">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-10">
              {stats.map((stat) => (
                <div key={stat.label} className="stagger-enter text-center group">
                  <div className="inline-flex items-center justify-center rounded-2xl bg-[#FE0404]/[0.06] dark:bg-[#FE0404]/10 p-3.5 mb-4 group-hover:bg-[#FE0404] group-hover:text-white transition-all duration-500 group-hover:shadow-lg group-hover:shadow-[#FE0404]/20 group-hover:scale-110">
                    <stat.icon className="h-6 w-6 text-[#FE0404] group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground animate-count tracking-tight">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        </RevealOnScroll>

        {/* ══════════ FEATURES ══════════ */}
        <RevealOnScroll delay={100}>
        <section className="relative py-24 sm:py-32 bg-gradient-to-b from-slate-50/60 via-white to-white dark:from-muted/20 dark:via-background dark:to-background overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-[0.2] dark:opacity-30 pointer-events-none" />
          <div className="container mx-auto px-4 sm:px-6 relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full liquid-glass-badge px-4 py-1.5 text-sm font-medium text-muted-foreground mb-4">
                <Zap className="h-3.5 w-3.5 text-[#FE0404]" />
                {t('landing.features')}
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.02em] mb-4">
                {t('landing.everythingYouNeed1')}
                <br />
                <span className="text-[#FE0404]">{t('landing.everythingYouNeed2')}</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                {t('landing.everythingYouNeedDesc')}
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 perspective-container">
              {features.slice(0, 6).map((feature) => (
                <Card
                  key={feature.title}
                  className="stagger-enter group relative overflow-hidden liquid-glass-card card-3d spotlight-card transition-all duration-500 hover:shadow-xl"
                >
                  <CardContent className="p-8 relative z-10">
                    <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                      <feature.icon className="h-7 w-7 text-[#FE0404]" />
                    </div>
                    <h3 className="mb-3 font-bold text-xl tracking-tight">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  </CardContent>
                </Card>
              ))}
              {/* MCP / AI Integration — full-width highlight card */}
              {features.length > 6 && (() => {
                const mcpFeature = features[6];
                return (
                  <Card className="stagger-enter group relative overflow-hidden sm:col-span-2 lg:col-span-3 liquid-glass-card card-3d spotlight-card transition-all duration-500 hover:shadow-xl border-indigo-500/10">
                    <CardContent className="p-8 sm:p-10 relative z-10">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className={`shrink-0 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${mcpFeature.bg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                          <mcpFeature.icon className="h-8 w-8 text-indigo-500" />
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-2 font-bold text-xl tracking-tight">{mcpFeature.title}</h3>
                          <p className="text-muted-foreground leading-relaxed max-w-2xl">{mcpFeature.description}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                          {['VS Code', 'Cursor', 'Claude'].map((platform) => (
                            <span key={platform} className="inline-flex items-center rounded-lg bg-indigo-500/[0.06] dark:bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {platform}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${mcpFeature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        </section>
        </RevealOnScroll>

        {/* ══════════ HOW IT WORKS ══════════ */}
        <RevealOnScroll delay={100}>
        <section className="relative py-20 sm:py-28 bg-white dark:bg-background overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-[0.2] dark:opacity-30 pointer-events-none" />
          <div className="container mx-auto px-4 sm:px-6 relative">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.02em] mb-4">
                {t('landing.stepsTitle1')}{' '}
                <span className="text-[#FE0404]">{t('landing.stepsTitle2')}</span>
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                {t('landing.stepsDesc')}
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
              {steps.map((s, i) => (
                <div key={s.step} className="stagger-enter relative group">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FE0404] to-[#CC0000] text-white text-xl font-extrabold shadow-lg shadow-[#FE0404]/20 mb-6 group-hover:scale-110 group-hover:shadow-xl group-hover:rotate-3 transition-all duration-500">
                      {s.step}
                    </div>
                    <h3 className="text-xl font-bold mb-3 tracking-tight">{s.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(50%+48px)] w-[calc(100%-48px)] h-0.5 bg-gradient-to-r from-[#FE0404]/30 to-[#FE0404]/10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
        </RevealOnScroll>

        {/* ══════════ CTA ══════════ */}
        <RevealOnScroll delay={150}>
        <section className="relative py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="relative rounded-3xl overflow-hidden grain-overlay">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FE0404] via-[#E00303] to-[#AA0000]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.1),transparent_50%)]" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse-glow" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />

              <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center text-white">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">
                  {t('landing.ctaTitle1')}
                  <br />
                  {t('landing.ctaTitle2')}
                </h2>
                <p className="text-white/80 max-w-lg mx-auto mb-10 text-lg">
                  {t('landing.ctaDesc')}
                </p>
                <Link href="/login">
                  <Button size="lg" className="bg-white text-[#FE0404] hover:bg-white/90 h-14 px-10 text-base font-bold rounded-2xl shadow-2xl hover:scale-[1.02] transition-all duration-300 gap-2">
                    {t('landing.ctaButton')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        </RevealOnScroll>
      </main>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-black/[0.04] dark:border-white/[0.06] bg-slate-50/50 dark:bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <WmcLogo size="sm" showTagline />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border border-black/[0.06] dark:border-white/[0.08] px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <svg viewBox="0 0 24 16" className="h-3.5 w-5 shrink-0 rounded-sm overflow-hidden shadow-sm">
                  <rect width="24" height="5.33" fill="#000" />
                  <rect y="5.33" width="24" height="5.33" fill="#D00000" />
                  <rect y="10.67" width="24" height="5.33" fill="#FFCC00" />
                </svg>
                Made in Germany
              </div>
              <p className="text-sm text-muted-foreground">
                {t('common.copyright', { year: new Date().getFullYear() })}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
