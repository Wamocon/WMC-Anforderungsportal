import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { WmcLogo } from '@/components/wmc-logo';
import { Link } from '@/i18n/navigation';
import { ArrowRight, Clock, FileText, AlertTriangle, Sparkles, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function FormWelcomePage({
  params,
}: {
  params: Promise<{ locale: string; projectSlug: string }>;
}) {
  const { locale, projectSlug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();
  const supabase = await createClient();

  // Fetch project by slug
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', projectSlug)
    .eq('status', 'active')
    .single();

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
        <Card className="relative max-w-md w-full mx-4 border-0 shadow-2xl shadow-black/5 glass-v2 glow-border">
          <CardContent className="p-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 mb-4">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('form.projectNotFound')}</h1>
            <p className="text-muted-foreground">
              {t('form.projectNotFoundDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user has an existing response — redirect accordingly
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: existingResponse } = await supabase
      .from('responses')
      .select('id, status')
      .eq('project_id', project.id)
      .eq('respondent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingResponse) {
      if (existingResponse.status === 'submitted' || existingResponse.status === 'reviewed') {
        // Already submitted — go to done page
        redirect(`/${locale}/form/${projectSlug}/done`);
      }
      if (existingResponse.status === 'in_progress' || existingResponse.status === 'draft') {
        // Has in-progress work — skip welcome, go directly to fill
        redirect(`/${locale}/form/${projectSlug}/fill`);
      }
    }
  }

  // Get section count for the template
  let sectionCount = 6;
  if (project.template_id) {
    const { count } = await supabase
      .from('template_sections')
      .select('id', { count: 'exact', head: true })
      .eq('template_id', project.template_id);
    sectionCount = count ?? 6;
  }

  // Extract welcome text for current locale
  const welcomeText = project.welcome_text as Record<string, string> | null;
  const welcomeMessage = welcomeText?.[locale] || welcomeText?.['en'] || welcomeText?.['de'] || t('form.welcomeTitle');

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FE0404]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

      {/* Header */}
      <header className="relative border-b border-border/30 glass-v2">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <WmcLogo size="md" />
          <LanguageSwitcher />
        </div>
      </header>

      {/* Content */}
      <main className="relative container mx-auto px-4 py-12 max-w-2xl flex-1">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FE0404]/10 to-[#FE0404]/5 mb-4">
            <FileText className="h-8 w-8 text-[#FE0404]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {t('form.welcomeTitle')}
          </h1>
          <p className="text-lg text-muted-foreground">
            {project.name}
          </p>
        </div>

        <Card className="mb-8 border-0 shadow-md shadow-black/5 glass-v2 spotlight-card">
          <CardContent className="p-6 sm:p-8">
            <p className="text-foreground leading-relaxed whitespace-pre-line">
              {welcomeMessage}
            </p>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card className="border-0 shadow-sm bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-2.5">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {t('form.estimatedTime', { minutes: '15-20' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sectionCount} {t('form.sectionsCount')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-2.5">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('form.aiAssisted')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('form.smartFollowups')}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-card/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 p-2.5">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('form.autoSaved')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('form.progressAutoSaved')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA — single button to the hybrid form */}
        <Link href={`/form/${projectSlug}/fill`} className="block">
          <Button
            size="lg"
            className="w-full h-14 bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white gap-2 rounded-xl shadow-lg shadow-[#FE0404]/20 hover:shadow-xl hover:shadow-[#FE0404]/30 transition-all text-base font-semibold"
          >
            {t('form.startForm')}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-border/40 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          {t('common.copyright', { year: new Date().getFullYear() })}
        </div>
      </footer>
    </div>
  );
}
