import { cn } from '@/lib/utils/cn';

type SkeletonProps = {
  className?: string;
};

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn('animate-pulse rounded-lg bg-ink/10 dark:bg-white/10', className)} />
);

