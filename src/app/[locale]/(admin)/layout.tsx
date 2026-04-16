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
  FileText,
  MessageSquareText,
  Settings,
  Menu,
  LogOut,
  ChevronLeft,
  Loader2,
  Archive,
  ClipboardList,
  Terminal,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const ADMIN_ROLES = ['super_admin', 'staff'];

const navItems = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'requirements', href: '/requirements', icon: ClipboardList },
  { key: 'projects', href: '/projects', icon: FolderKanban },
  { key: 'templates', href: '/templates', icon: FileText },
  { key: 'responses', href: '/responses', icon: MessageSquareText },
  { key: 'archive', href: '/archive', icon: Archive },
  { key: 'aiSetupNav', href: '/ai-setup', icon: Terminal },
  { key: 'settings', href: '/settings', icon: Settings },
] as const;

type AdminNavContentProps = {
  collapsed: boolean;
  isMobile?: boolean;
  pathname: string;
  userEmail: string | null;
  onCollapseToggle: () => void;
  onCloseMobile: () => void;
  onLogout: () => void;
};

function AdminNavContent({
  collapsed,
  isMobile = false,
  pathname,
  userEmail,
  onCollapseToggle,
  onCloseMobile,
  onLogout,
}: AdminNavContentProps) {
  const t = useTranslations('admin');

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-border/50 px-4">
        {collapsed && !isMobile ? (
          <WmcLogo variant="mark" size="sm" />
        ) : (
          <WmcLogo size="sm" showTagline />
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8"
            onClick={onCollapseToggle}
          >
            <ChevronLeft
              className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')}
            />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.includes(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => isMobile && onCloseMobile()}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-[#FE0404]/10 to-[#FE0404]/5 text-[#FE0404] shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'drop-shadow-sm')} />
              {(!collapsed || isMobile) && <span>{t(item.key)}</span>}
              {isActive && (!collapsed || isMobile) && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FE0404]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/50 p-3 space-y-2">
        {(!collapsed || isMobile) && userEmail && (
          <div className="px-3 py-1.5">
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        )}
        {(!collapsed || isMobile) && <LanguageSwitcher />}
        <div className={cn('flex items-center', collapsed && !isMobile ? 'justify-center' : 'px-3')}>
          <ThemeToggle />
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!collapsed || isMobile) && <span>{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Auth guard: verify user is logged in AND has admin role
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        const locale = pathname.split('/')[1] || 'de';
        router.replace(`/${locale}/login?redirectTo=${encodeURIComponent(pathname)}`);
        return;
      }

      // Check role — redirect non-admin users to client portal
      const role = user.app_metadata?.role || 'client';
      if (!ADMIN_ROLES.includes(role)) {
        const locale = pathname.split('/')[1] || 'de';
        router.replace(`/${locale}/my-projects`);
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

  // Show loading spinner while checking auth
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
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border/30 glass-v2 transition-all duration-500',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <AdminNavContent
          collapsed={collapsed}
          pathname={pathname}
          userEmail={userEmail}
          onCollapseToggle={() => setCollapsed((prev) => !prev)}
          onCloseMobile={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <AdminNavContent
            collapsed={collapsed}
            isMobile
            pathname={pathname}
            userEmail={userEmail}
            onCollapseToggle={() => setCollapsed((prev) => !prev)}
            onCloseMobile={() => setMobileOpen(false)}
            onLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center border-b border-border/30 glass-v2 px-4 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-3">
            <WmcLogo size="sm" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 sm:p-6 max-w-7xl animate-page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
