import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MagicLinkPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  // Validate magic link token against DB
  const { data: magicLink } = await supabase
    .from('magic_links')
    .select('id, project_id, email, status, expires_at')
    .eq('token_hash', token)
    .single();

  if (!magicLink) {
    return <MagicLinkError reason="not_found" />;
  }

  // Check expiry
  if (new Date(magicLink.expires_at) < new Date()) {
    // Update status to expired
    await supabase
      .from('magic_links')
      .update({ status: 'expired' })
      .eq('id', magicLink.id);
    return <MagicLinkError reason="expired" />;
  }

  if (magicLink.status === 'expired' || magicLink.status === 'revoked') {
    return <MagicLinkError reason={magicLink.status} />;
  }

  // Mark as opened
  await supabase
    .from('magic_links')
    .update({ status: 'opened' })
    .eq('id', magicLink.id);

  // Get project slug
  const { data: project } = await supabase
    .from('projects')
    .select('slug')
    .eq('id', magicLink.project_id)
    .single();

  if (!project) {
    return <MagicLinkError reason="not_found" />;
  }

  // Redirect to the form
  redirect(`/${locale}/form/${project.slug}/fill`);
}

function MagicLinkError({ reason }: { reason: string }) {
  return <MagicLinkErrorContent reason={reason} />;
}

async function MagicLinkErrorContent({ reason }: { reason: string }) {
  const t = await getTranslations('errors');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
      <Card className="relative w-full max-w-md text-center border-0 shadow-2xl shadow-black/5 bg-card/80 backdrop-blur-xl">
        <CardContent className="p-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-bold mb-2">
            {reason === 'expired' ? t('linkExpiredTitle') : reason === 'revoked' ? t('linkRevokedTitle') : t('linkNotFoundTitle')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {reason === 'expired'
              ? t('linkExpired')
              : reason === 'revoked'
                ? t('linkRevoked')
                : t('linkNotFound')}
          </p>
          <Link href="/login">
            <Button className="bg-[#FE0404] hover:bg-[#E00303] text-white">
              {t('goToLogin')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
