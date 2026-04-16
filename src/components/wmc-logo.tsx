import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface WmcLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  variant?: 'full' | 'mark';
}

const sizes = {
  sm: { markW: 28, markH: 28, rx: 7,  text1: 'text-[13px]', text2: 'text-[13px]', tagline: 'text-[8px]' },
  md: { markW: 36, markH: 36, rx: 9,  text1: 'text-[15px]', text2: 'text-[15px]', tagline: 'text-[9px]' },
  lg: { markW: 44, markH: 44, rx: 11, text1: 'text-[18px]', text2: 'text-[18px]', tagline: 'text-[10px]' },
  xl: { markW: 64, markH: 64, rx: 16, text1: 'text-[26px]', text2: 'text-[26px]', tagline: 'text-xs' },
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
      <svg
        width={s.markW}
        height={s.markH}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        {/* Red rounded-square background */}
        <rect width="40" height="40" rx={s.rx} fill="#FE0404" />
        {/* Portal Gate — two pillars + arch, white */}
        {/* Left pillar */}
        <rect x="7" y="16" width="5" height="17" rx="1.5" fill="white" />
        {/* Right pillar */}
        <rect x="28" y="16" width="5" height="17" rx="1.5" fill="white" />
        {/* Arch connecting pillar tops */}
        <path
          d="M7 16 Q20 4 33 16"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

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

