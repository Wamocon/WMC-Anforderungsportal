'use client';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { WmcLogo } from '@/components/wmc-logo';
import { useTranslations } from 'next-intl';

export function LandingHeader() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-50 w-full glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <WmcLogo size="md" showTagline />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/login">
            <Button size="sm" className="bg-[#FE0404] hover:bg-[#D00303] text-white shadow-sm hover:shadow-md transition-all duration-300">
              {t('auth.login')}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
