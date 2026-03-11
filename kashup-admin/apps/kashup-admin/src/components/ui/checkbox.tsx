import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const baseStyles =
  'h-4 w-4 rounded border-ink/20 text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  onCheckedChange?: (checked: boolean) => void;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...rest }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(baseStyles, className)}
      checked={checked}
      onChange={(e) => {
        onChange?.(e);
        onCheckedChange?.(e.target.checked);
      }}
      {...rest}
    />
  ),
);

Checkbox.displayName = 'Checkbox';

