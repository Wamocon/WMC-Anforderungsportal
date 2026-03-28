import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('errors');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground px-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FE0404] to-[#CC0303] shadow-lg">
            <span className="text-white font-bold text-2xl">W</span>
          </div>
        </div>
        <h1 className="text-7xl font-bold text-[#FE0404] mb-2">404</h1>
        <h2 className="text-2xl font-semibold mb-4">{t('notFound')}</h2>
        <p className="text-muted-foreground mb-8">
          {t('notFoundDescription')}
        </p>
        <Link href="/">
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#FE0404] px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#E00303] transition-all duration-200 hover:-translate-y-0.5">
            {t('backToHome')}
          </button>
        </Link>
      </div>
    </div>
  );
}
