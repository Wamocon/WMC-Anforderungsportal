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
import { LanguageSwitcher } from '@/components/language-switcher';
import { WmcLogo } from '@/components/wmc-logo';

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
      title: 'Smart Forms',
      description: 'Intelligent requirement forms with conditional logic, validation, and auto-save that never loses your progress.',
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: Mic,
      title: 'Voice Input',
      description: 'Speak your answers in any language — our free browser-native speech recognition transcribes in real-time.',
      gradient: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-500/10',
    },
    {
      icon: Bot,
      title: 'AI Interviewer',
      description: 'Let Gemini AI guide your clients through requirements via natural conversation in their preferred language.',
      gradient: 'from-[#FE0404] to-orange-500',
      bg: 'bg-[#FE0404]/10',
    },
    {
      icon: Globe,
      title: '25 Languages',
      description: 'Complete support for all EU official languages plus Turkish and Russian — reach every client.',
      gradient: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-500/10',
    },
    {
      icon: Shield,
      title: 'GDPR Compliant',
      description: 'Enterprise-grade security with row-level policies, encrypted data, and full DSGVO compliance.',
      gradient: 'from-amber-500 to-yellow-500',
      bg: 'bg-amber-500/10',
    },
    {
      icon: BarChart3,
      title: 'Real-time Dashboard',
      description: 'Track response progress, completion rates, and project timelines — all in one elegant dashboard.',
      gradient: 'from-pink-500 to-rose-500',
      bg: 'bg-pink-500/10',
    },
  ];

  const stats = [
    { value: '25', label: 'Languages Supported', icon: Globe },
    { value: '100%', label: 'GDPR Compliant', icon: Shield },
    { value: '< 5min', label: 'Setup Time', icon: Zap },
    { value: '24/7', label: 'AI Available', icon: Bot },
  ];

  const steps = [
    { step: '01', title: 'Create a Project', desc: 'Set up your requirement collection in seconds with customizable templates.' },
    { step: '02', title: 'Share the Link', desc: 'Send your clients a magic link — no account needed on their end.' },
    { step: '03', title: 'Collect & Analyze', desc: 'Responses flow in real-time. Review, export, and start building.' },
  ];

  return (
    <div className="flex min-h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <WmcLogo size="md" showTagline />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/login">
              <Button size="sm" className="bg-[#FE0404] hover:bg-[#D00303] text-white shadow-sm hover:shadow-md transition-all duration-300">
                {t('auth.login')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0">
            <div className="absolute top-20 left-10 w-72 h-72 bg-[#FE0404]/10 rounded-full blur-3xl animate-pulse-glow" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#FE0404]/5 to-purple-500/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '4s' }} />
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 relative">
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge */}
              <div className="animate-slide-up inline-flex items-center gap-2 rounded-full border border-[#FE0404]/20 bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium text-[#FE0404] shadow-sm mb-8">
                <Sparkles className="h-4 w-4" />
                <span>{t('common.poweredBy')}</span>
              </div>

              {/* Heading */}
              <h1 className="animate-slide-up stagger-1 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  Collect Requirements
                </span>
                <br />
                <span className="bg-gradient-to-r from-[#FE0404] via-[#FF3333] to-[#CC0000] bg-clip-text text-transparent animate-gradient bg-[length:200%_200%]">
                  Like a Pro
                </span>
              </h1>

              {/* Subheading */}
              <p className="animate-slide-up stagger-2 mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                {t('common.tagline')}
              </p>

              {/* CTA Buttons */}
              <div className="animate-slide-up stagger-3 flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
                <Link href="/login">
                  <Button size="lg" className="bg-[#FE0404] hover:bg-[#D00303] text-white gap-2 h-14 px-10 text-base font-semibold rounded-xl shadow-xl shadow-[#FE0404]/25 hover:shadow-2xl hover:shadow-[#FE0404]/30 hover:-translate-y-0.5 transition-all duration-300">
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="gap-2 h-14 px-10 text-base font-semibold rounded-xl hover:bg-accent/50 transition-all duration-300">
                    <Bot className="h-5 w-5" />
                    Try AI Interview
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="animate-slide-up stagger-4 mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  No credit card
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  GDPR ready
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  25 languages
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="relative border-y bg-gradient-to-r from-gray-50 via-white to-gray-50">
          <div className="container mx-auto px-4 sm:px-6 py-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={stat.label} className={`animate-slide-up stagger-${i + 1} text-center group`}>
                  <div className="inline-flex items-center justify-center rounded-2xl bg-[#FE0404]/10 p-3 mb-4 group-hover:bg-[#FE0404] group-hover:text-white transition-all duration-300 group-hover:shadow-lg group-hover:shadow-[#FE0404]/20">
                    <stat.icon className="h-6 w-6 text-[#FE0404] group-hover:text-white transition-colors" />
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="relative py-24 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground mb-4">
                <Zap className="h-3.5 w-3.5 text-[#FE0404]" />
                Features
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                Everything you need to collect
                <br />
                <span className="text-[#FE0404]">perfect requirements</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                Professional tools designed for IT consultancies who want to impress clients from day one.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <Card
                  key={feature.title}
                  className={`animate-slide-up stagger-${i + 1} group relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1`}
                >
                  <CardContent className="p-8">
                    <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-7 w-7 text-[#FE0404]" />
                    </div>
                    <h3 className="mb-3 font-bold text-xl">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    {/* Hover gradient accent */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="relative py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
                Three steps to{' '}
                <span className="text-[#FE0404]">better requirements</span>
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                From project creation to analysis, we make it effortless.
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
              {steps.map((s, i) => (
                <div key={s.step} className={`animate-slide-up stagger-${i + 1} relative group`}>
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FE0404] to-[#CC0000] text-white text-xl font-extrabold shadow-lg shadow-[#FE0404]/20 mb-6 group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
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

        {/* CTA */}
        <section className="relative py-24">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="relative rounded-3xl overflow-hidden">
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FE0404] via-[#E00303] to-[#AA0000]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.1),transparent_50%)]" />

              <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center text-white">
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
                  Ready to transform how you
                  <br />
                  collect requirements?
                </h2>
                <p className="text-white/80 max-w-lg mx-auto mb-10 text-lg">
                  Join professional IT consultancies who save hours on every project with WMC Anforderungsportal.
                </p>
                <Link href="/login">
                  <Button size="lg" className="bg-white text-[#FE0404] hover:bg-gray-100 h-14 px-10 text-base font-bold rounded-xl shadow-2xl hover:-translate-y-0.5 transition-all duration-300 gap-2">
                    Start Collecting Now
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-gray-50/50">
        <div className="container mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <WmcLogo size="sm" showTagline />
            <p className="text-sm text-muted-foreground">
              {t('common.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
