import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type Tone = 'primary' | 'success' | 'warning' | 'muted';

const toneStyles: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  muted: 'bg-ink/10 text-ink/80',
};

type BadgeProps = {
  tone?: Tone;
  children: ReactNode;
  className?: string;
};

export const Badge = ({ tone = 'muted', children, className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
      toneStyles[tone],
      className,
    )}
  >
    {children}
  </span>
);

