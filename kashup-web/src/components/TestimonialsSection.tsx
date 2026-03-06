import { Quote, Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    text: "Simple et utile au quotidien. Je récupère du cashback sans y penser et je l'utilise en carte cadeau chez mes commerces.",
    author: "Marie L.",
    location: "Fort-de-France",
    rating: 5,
  },
  {
    text: "En quelques mois j'ai accumulé une belle cagnotte. L'app est claire et la connexion bancaire rassurante.",
    author: "Thomas M.",
    location: "Martinique",
    rating: 5,
  },
  {
    text: "Une appli qui se gère toute seule. Je fais mes achats et je cagnotte. Déjà deux cartes cadeaux reçues, c'est top.",
    author: "Sophie D.",
    location: "Guadeloupe",
    rating: 4,
  },
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="border-t border-slate-200/80 bg-slate-50 px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl lg:max-w-7xl">
        <h2 className="heading-section text-center text-slate-900">
          Ce que disent nos utilisateurs
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
          Ils utilisent KashUP au quotidien pour récupérer du cashback.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <blockquote
              key={i}
              className="card-premium relative p-6 transition"
            >
              <Quote className="absolute right-4 top-4 h-10 w-10 text-[var(--primary)]/15" aria-hidden />
              <Stars n={t.rating} />
              <p className="mt-4 pr-8 text-slate-700">&ldquo;{t.text}&rdquo;</p>
              <footer className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/15 text-sm font-bold text-[var(--primary)]">
                  {t.author.charAt(0)}
                </span>
                <div>
                  <cite className="not-italic font-semibold text-slate-900">{t.author}</cite>
                  {t.location && (
                    <p className="text-sm text-slate-500">{t.location}</p>
                  )}
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
