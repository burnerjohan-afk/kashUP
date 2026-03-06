'use client';

import { FileText, Download } from 'lucide-react';

export default function FacturesPage() {
  // TODO: brancher sur l'API quand l'endpoint factures partenaire existera
  const invoices: { id: string; ref: string; period: string; amount: number; date: string; url?: string }[] = [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Factures</h1>
      <p className="mb-8 text-slate-600">
        Consultez et téléchargez vos factures KashUP.
      </p>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <FileText className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Aucune facture</h2>
          <p className="mt-2 text-sm text-slate-500">
            Vos factures apparaîtront ici une fois générées par KashUP.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 font-semibold text-slate-700">Référence</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Période</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Montant</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Télécharger</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">{inv.ref}</td>
                  <td className="px-4 py-3 text-slate-600">{inv.period}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{inv.amount.toFixed(2)} €</td>
                  <td className="px-4 py-3 text-slate-600">{inv.date}</td>
                  <td className="px-4 py-3">
                    {inv.url ? (
                      <a
                        href={inv.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)]/10 px-3 py-1.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20"
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
