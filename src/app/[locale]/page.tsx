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
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* Header */}
      <LandingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden">
          {/* Video Background */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            poster="/hero-poster.webp"
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
          {/* Aurora + grain on top */}
          <div className="absolute inset-0 aurora-bg opacity-40" />
          <div className="absolute inset-0 grain-overlay opacity-30" />
          {/* Mesh gradient orbs */}
          <div className="mesh-orb mesh-orb-1 w-[500px] h-[500px] top-[10%] left-[5%] opacity-60" />
          <div className="mesh-orb mesh-orb-2 w-[400px] h-[400px] bottom-[10%] right-[10%] opacity-60" />
          <div className="mesh-orb mesh-orb-3 w-[350px] h-[350px] top-[40%] left-[50%] opacity-60" />

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge */}
              <div className="animate-slide-up inline-flex items-center gap-2 rounded-full border border-[#FE0404]/30 bg-white/10 backdrop-blur-md px-4 py-2 text-sm font-medium text-white shadow-sm mb-8">
                <Sparkles className="h-4 w-4 text-[#FE0404]" />
                <span>{t('common.poweredBy')}</span>
              </div>

              {/* Heading */}
              <h1 className="animate-slide-up stagger-1 text-3xl xs:text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                <span className="text-white drop-shadow-lg">
                  {t('landing.heroTitle1')}
                </span>
                <br />
                <span className="bg-gradient-to-r from-[#FE0404] via-[#FF3333] to-[#FF6B6B] bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
                  {t('landing.heroTitle2')}
                </span>
              </h1>

              {/* Subheading */}
              <p className="animate-slide-up stagger-2 mt-6 text-lg sm:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
                {t('common.tagline')}
              </p>

              {/* CTA Buttons */}
              <div className="animate-slide-up stagger-3 flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                <Link href="/login">
                  <Button size="lg" className="bg-[#FE0404] hover:bg-[#D00303] text-white gap-2 h-14 px-10 text-base font-semibold rounded-xl shadow-xl shadow-[#FE0404]/25 hover:shadow-2xl hover:shadow-[#FE0404]/30 hover:-translate-y-0.5 transition-all duration-300">
                    {t('landing.getStarted')}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="gap-2 h-14 px-10 text-base font-semibold rounded-xl text-white border-white/30 hover:bg-white/10 backdrop-blur-sm transition-all duration-300">
                    <Bot className="h-5 w-5" />
                    {t('landing.tryAiInterview')}
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="animate-slide-up stagger-4 mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  {t('landing.noCreditCard')}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  {t('landing.gdprReady')}
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  {t('landing.langCount')}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <RevealOnScroll>
        <section className="relative border-y bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-muted/50 dark:via-background dark:to-muted/50">
          <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
              {stats.map((stat, i) => (
                <div key={stat.label} className="stagger-enter text-center group">
                  <div className="inline-flex items-center justify-center rounded-2xl bg-[#FE0404]/10 p-3 mb-4 group-hover:bg-[#FE0404] group-hover:text-white transition-all duration-500 group-hover:shadow-lg group-hover:shadow-[#FE0404]/20 group-hover:scale-110">
                    <stat.icon className="h-6 w-6 text-[#FE0404] group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground animate-count">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        </RevealOnScroll>

        {/* Features */}
        <RevealOnScroll delay={100}>
        <section className="relative py-24 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground mb-4">
                <Zap className="h-3.5 w-3.5 text-[#FE0404]" />
                {t('landing.features')}
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                {t('landing.everythingYouNeed1')}
                <br />
                <span className="text-[#FE0404]">{t('landing.everythingYouNeed2')}</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                {t('landing.everythingYouNeedDesc')}
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 perspective-container">
              {features.map((feature, i) => (
                <Card
                  key={feature.title}
                  className={`stagger-enter group relative overflow-hidden border-0 shadow-sm hover:shadow-xl card-3d spotlight-card bento-card transition-all duration-500`}
                >
                  <CardContent className="p-8 relative z-10">
                    <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                      <feature.icon className="h-7 w-7 text-[#FE0404]" />
                    </div>
                    <h3 className="mb-3 font-bold text-xl">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    {/* Hover gradient accent */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
        </RevealOnScroll>

        {/* How it works */}
        <RevealOnScroll delay={100}>
        <section className="relative py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white dark:from-muted/30 dark:to-background">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                {t('landing.stepsTitle1')}{' '}
                <span className="text-[#FE0404]">{t('landing.stepsTitle2')}</span>
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                {t('landing.stepsDesc')}
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto perspective-container">
              {steps.map((s, i) => (
                <div key={s.step} className="stagger-enter relative group">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FE0404] to-[#CC0000] text-white text-xl font-extrabold shadow-lg shadow-[#FE0404]/20 mb-6 group-hover:scale-110 group-hover:shadow-xl group-hover:rotate-3 transition-all duration-500">
                      {s.step}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(50%+48px)] w-[calc(100%-48px)] h-0.5 bg-gradient-to-r from-[#FE0404]/30 to-[#FE0404]/10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
        </RevealOnScroll>

        {/* CTA */}
        <RevealOnScroll delay={150}>
        <section className="relative py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="relative rounded-3xl overflow-hidden grain-overlay">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FE0404] via-[#E00303] to-[#AA0000]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.1),transparent_50%)]" />
              {/* Animated orbs inside CTA */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse-glow" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />

              <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center text-white">
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
                  {t('landing.ctaTitle1')}
                  <br />
                  {t('landing.ctaTitle2')}
                </h2>
                <p className="text-white/80 max-w-lg mx-auto mb-10 text-lg">
                  {t('landing.ctaDesc')}
                </p>
                <Link href="/login">
                  <Button size="lg" className="bg-card text-[#FE0404] hover:bg-accent h-14 px-10 text-base font-bold rounded-xl shadow-2xl hover:-translate-y-0.5 transition-all duration-300 gap-2">
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

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <WmcLogo size="sm" showTagline />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground">
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
