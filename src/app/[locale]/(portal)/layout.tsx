'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { WmcLogo } from '@/components/wmc-logo';
import {
  LayoutDashboard,
  FolderKanban,
  Menu,
  LogOut,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const ADMIN_ROLES = ['super_admin', 'admin', 'manager'];

const clientNavItems = [
  { key: 'myProjects', href: '/my-projects', icon: FolderKanban },
] as const;

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        const locale = pathname.split('/')[1] || 'de';
        router.replace(`/${locale}/login?redirectTo=${encodeURIComponent(pathname)}`);
        return;
      }

      const role = user.app_metadata?.role || 'user';
      // If user is admin, redirect to admin dashboard
      if (ADMIN_ROLES.includes(role)) {
        const locale = pathname.split('/')[1] || 'de';
        router.replace(`/${locale}/dashboard`);
        return;
      }

      setUserEmail(user.email ?? null);
      setAuthChecked(true);
    });
  }, [pathname, router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    const locale = pathname.split('/')[1] || 'de';
    router.push(`/${locale}/login`);
  }

  function NavContent({ isMobile = false }: { isMobile?: boolean }) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center border-b border-border/50 px-4">
          <WmcLogo size="sm" showTagline />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {clientNavItems.map((item) => {
            const isActive = pathname.includes(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => isMobile && setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-[#FE0404]/10 to-[#FE0404]/5 text-[#FE0404] shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'drop-shadow-sm')} />
                <span>{t(`client.${item.key}`)}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FE0404]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/50 p-3 space-y-2">
          {userEmail && (
            <div className="px-3 py-1.5">
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
          )}
          <LanguageSwitcher />
          <div className="flex items-center px-3">
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <WmcLogo size="md" />
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <aside className="hidden lg:flex flex-col border-r border-border/50 bg-card/80 backdrop-blur-xl w-64">
        <NavContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <NavContent isMobile />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-3">
            <WmcLogo size="sm" />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 sm:p-6 max-w-5xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
