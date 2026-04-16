'use client';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { WmcLogo } from '@/components/wmc-logo';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

export function LandingHeader() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto mt-0 sm:mt-4 max-w-5xl px-4 sm:px-6">
        <div className="liquid-glass-nav flex h-16 items-center justify-between px-5 rounded-none sm:rounded-2xl">
          <WmcLogo size="md" showTagline />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link href="/login">
              <Button size="sm" className="bg-[#FE0404]/80 backdrop-blur-[2px] hover:bg-[#FE0404] text-white rounded-xl shadow-sm hover:shadow-lg hover:shadow-[#FE0404]/20 hover:scale-[1.02] transition-all duration-300 gap-1.5">
                {t('auth.login')}
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
