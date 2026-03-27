import { cn } from '@/lib/utils';

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
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Logo Mark */}
      <div className={cn(
        'relative shrink-0 flex items-center justify-center rounded-xl font-black text-white bg-gradient-to-br from-[#FE0404] to-[#CC0000] shadow-sm',
        s.mark,
        s.text
      )}>
        W
      </div>

      {/* Text */}
      {variant === 'full' && (
        <div className="flex flex-col min-w-0">
          <span className={cn('font-bold tracking-tight leading-tight', s.text)}>
            WMC
          </span>
          {showTagline && (
            <span className={cn('text-[#FE0404] font-semibold leading-tight', s.tagline)}>
              IT-Testmanagement
            </span>
          )}
        </div>
      )}
    </div>
  );
}
