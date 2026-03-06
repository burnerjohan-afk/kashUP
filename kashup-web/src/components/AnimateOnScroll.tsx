'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Variant = 'fadeUp' | 'fadeIn' | 'stagger' | 'scale';

type Props = {
  children: ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  rootMargin?: string;
};

export function AnimateOnScroll({
  children,
  variant = 'fadeUp',
  delay = 0,
  className = '',
  rootMargin = '0px 0px -60px 0px',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const base = 'transition-all duration-700 ease-out';
  const delayStyle = delay ? { transitionDelay: `${delay}ms` } : undefined;

  const variantClasses = {
    fadeUp: visible
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 translate-y-8',
    fadeIn: visible
      ? 'opacity-100'
      : 'opacity-0',
    stagger: visible
      ? 'animate-stagger-visible'
      : '',
    scale: visible
      ? 'opacity-100 scale-100'
      : 'opacity-0 scale-95',
  };

  const isStagger = variant === 'stagger';
  const wrapperClass = isStagger
    ? `animate-stagger ${visible ? 'animate-stagger-visible' : ''} ${className}`
    : `${base} ${variantClasses[variant]} ${className}`;

  return (
    <div
      ref={ref}
      className={wrapperClass}
      style={!isStagger ? delayStyle : undefined}
    >
      {children}
    </div>
  );
}
