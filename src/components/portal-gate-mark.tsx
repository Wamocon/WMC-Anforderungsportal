import { cn } from '@/lib/utils';
import type { SVGProps } from 'react';

type PortalGateMarkProps = SVGProps<SVGSVGElement>;

// Single-source brand mark used across logo and hero visuals.
export function PortalGateMark({ className, ...props }: PortalGateMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
      role="img"
      {...props}
    >
      <rect width="40" height="40" rx="10" fill="#FE0404" />
      <rect x="7" y="16" width="5" height="17" rx="1.5" fill="white" />
      <rect x="28" y="16" width="5" height="17" rx="1.5" fill="white" />
      <path d="M7 16 Q20 4 33 16" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}