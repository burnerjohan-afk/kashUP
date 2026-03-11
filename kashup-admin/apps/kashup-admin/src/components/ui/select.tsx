import { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ className, children, ...rest }: SelectProps) => (
  <select
    className={cn(
      'w-full rounded-lg border border-ink/10 bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-white/10 dark:text-white',
      className,
    )}
    {...rest}
  >
    {children}
  </select>
);

