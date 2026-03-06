'use client';

import { CreditCard, Calendar, Info } from 'lucide-react';

export default function AReglerPage() {
  // TODO: brancher sur l'API quand l'endpoint partenaire "à régler" existera
  const amountDue = 0;
  const nextDueDate = null;
  const history: { period: string; amount: number; status: string }[] = [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">À régler à KashUP</h1>
      <p className="mb-8 text-slate-600">
        Montant des commissions ou frais à régler à KashUP au titre de votre partenariat.
      </p>

      <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--primary)]/10">
            <CreditCard className="h-7 w-7 text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Montant dû</p>
            <p className="text-3xl font-bold text-slate-900">
              {amountDue > 0 ? `${amountDue.toFixed(2)} €` : '0,00 €'}
            </p>
            {nextDueDate && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                <Calendar className="h-4 w-4" />
                Prochaine échéance : {nextDueDate}
              </p>
            )}
          </div>
        </div>
        {amountDue === 0 && !history.length && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <Info className="h-5 w-5 shrink-0 text-slate-400" />
            <p className="text-sm text-slate-600">
              Aucun montant à régler pour le moment. Les éventuelles commissions ou frais vous seront communiqués et apparaîtront ici.
            </p>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Historique des règlements</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 font-semibold text-slate-700">Période</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Montant</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.period}</td>
                    <td className="px-4 py-3 text-slate-600">{row.amount.toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
