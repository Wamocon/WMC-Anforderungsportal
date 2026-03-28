import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface WmcLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  variant?: 'full' | 'mark';
}

const sizes = {
  sm: { mark: 'h-7 w-7', text: 'text-sm', tagline: 'text-[8px]' },
  md: { mark: 'h-9 w-9', text: 'text-base', tagline: 'text-[9px]' },
  lg: { mark: 'h-11 w-11', text: 'text-lg', tagline: 'text-[10px]' },
  xl: { mark: 'h-16 w-16', text: 'text-2xl', tagline: 'text-xs' },
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
      {/* Logo Mark — clipboard with checkmark */}
      <div className={cn(
        'relative shrink-0 flex items-center justify-center rounded-xl font-black text-white bg-gradient-to-br from-[#FE0404] to-[#CC0000] shadow-md shadow-[#FE0404]/15',
        s.mark,
        s.text
      )}>
        <svg viewBox="0 0 24 24" fill="none" className="w-[58%] h-[58%]">
          {/* Clipboard body */}
          <rect x="4" y="4" width="16" height="17" rx="2" stroke="currentColor" strokeWidth="2"/>
          {/* Clipboard clip */}
          <path d="M9 2h6v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V2z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.3"/>
          {/* Checkmark */}
          <path d="M8 13l3 3 5-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Text */}
      {variant === 'full' && (
        <div className="flex flex-col min-w-0">
          <span className={cn('font-bold tracking-tight leading-tight', s.text)}>
            Anforderungsportal
          </span>
          {showTagline && (
            <span className={cn('text-[#FE0404] font-semibold leading-tight', s.tagline)}>
              {t('requirementManager')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
