'use client';

import { CountUp } from './CountUp';

type Props = { partnersCount: number };

export function StatBlock({ partnersCount }: Props) {
  const value = Math.max(partnersCount, 1);
  const suffix = value > 1 ? ' partenaires' : ' partenaire';
  return (
    <section className="border-y border-slate-200/80 bg-white px-4 py-10 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Ils nous font confiance
        </p>
        <p className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
          <CountUp value={value} duration={1800} suffix={suffix} />
        </p>
        <p className="mt-1 text-slate-600">
          pour économiser au quotidien
        </p>
      </div>
    </section>
  );
}
