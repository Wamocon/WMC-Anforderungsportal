import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { PortalGateMark } from '@/components/portal-gate-mark';

interface WmcLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  variant?: 'full' | 'mark';
}

const sizes = {
  sm: { markW: 28, markH: 28, text1: 'text-[13px]', text2: 'text-[13px]', tagline: 'text-[8px]' },
  md: { markW: 36, markH: 36, text1: 'text-[15px]', text2: 'text-[15px]', tagline: 'text-[9px]' },
  lg: { markW: 44, markH: 44, text1: 'text-[18px]', text2: 'text-[18px]', tagline: 'text-[10px]' },
  xl: { markW: 64, markH: 64, text1: 'text-[26px]', text2: 'text-[26px]', tagline: 'text-xs' },
};

export function WmcLogo({
  className,
  size = 'md',
  showTagline = false,
  variant = 'full',
}: WmcLogoProps) {
  const t = useTranslations('common');
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {/* Portal Gate mark */}
      <PortalGateMark className="shrink-0" width={s.markW} height={s.markH} />

      {/* Wordmark */}
      {variant === 'full' && (
        <div className="flex flex-col leading-[1.15] min-w-0">
          <span className={cn('font-bold tracking-tight text-foreground', s.text1)}>
            Anforderungs
          </span>
          <span className={cn('font-bold tracking-tight text-[#FE0404]', s.text2)}>
            portal
          </span>
          {showTagline && (
            <span className={cn('text-muted-foreground font-medium leading-tight mt-0.5', s.tagline)}>
              {t('requirementManager')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

