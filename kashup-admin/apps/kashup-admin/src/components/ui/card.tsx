import { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

type CardProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export const Card = ({ title, description, actions, children, className }: CardProps) => (
  <section className={cn('glass-panel p-6', className)}>
    {(title || actions) && (
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          {title && <h3 className="text-base font-semibold text-primary">{title}</h3>}
          {description && <p className="text-sm text-ink/70">{description}</p>}
        </div>
        {actions}
      </header>
    )}
    {children}
  </section>
);

