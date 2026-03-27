import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ locale: string; projectSlug: string }>;
}) {
  const { locale, projectSlug } = await params;
  setRequestLocale(locale);

  // Redirect to the hybrid form (interview is now integrated into the form)
  redirect(`/${locale}/form/${projectSlug}/fill`);
}

