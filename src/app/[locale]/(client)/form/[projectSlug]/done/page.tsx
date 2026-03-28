import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WmcLogo } from '@/components/wmc-logo';
import { Link } from '@/i18n/navigation';
import { CheckCircle2, Home, FolderKanban } from 'lucide-react';

export default async function DonePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DoneContent />;
}

function DoneContent() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-50/30" />
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-green-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl" />

      <Card className="relative z-10 w-full max-w-md text-center border-0 shadow-2xl shadow-black/5 bg-card/80 backdrop-blur-xl">
        <CardContent className="p-8 sm:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 animate-pulse-glow">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-3">{t('form.submitted')}</h1>
          <p className="text-muted-foreground leading-relaxed">
            {t('form.submittedMessage', { days: '3-5' })}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link href="/my-projects">
              <Button className="w-full gap-2 bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white">
                <FolderKanban className="h-4 w-4" />
                {t('client.myProjects')}
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full gap-2">
                <Home className="h-4 w-4" />
                {t('common.home')}
              </Button>
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-border/40">
            <div className="flex items-center justify-center">
              <WmcLogo size="sm" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('common.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
