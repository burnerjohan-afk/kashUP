import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-soft hover:bg-primary-hover focus-visible:outline-primary',
  secondary: 'bg-ink/5 text-ink hover:bg-ink/10 focus-visible:outline-primary',
  ghost: 'text-ink hover:bg-ink/10 focus-visible:outline-primary',
  danger: 'bg-warning text-white hover:bg-warning/80 focus-visible:outline-warning',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, disabled, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], className)}
        disabled={disabled || isLoading}
        {...rest}
      >
        {/* Toujours rendre le span pour éviter les problèmes de DOM, mais le cacher si pas de loading */}
        <span className={cn(
          "h-4 w-4 rounded-full border-b-2 border-current",
          isLoading ? "inline-block animate-spin" : "hidden"
        )} />
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

