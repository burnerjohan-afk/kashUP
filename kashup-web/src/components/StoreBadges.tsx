'use client';

const appStoreUrl = 'https://apps.apple.com/app/kashup/idXXXXXXXX';
const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.kashup.mobile';

// Badge officiel Google Play (PNG hébergé par Google)
const GOOGLE_PLAY_BADGE_URL =
  'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png';

/** Badge App Store — style officiel Apple (fond noir, logo Apple, typo) */
function AppStoreBadge() {
  return (
    <a
      href={appStoreUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex h-12 items-center gap-3 rounded-xl border-0 bg-black px-5 py-2.5 shadow-lg shadow-black/25 ring-1 ring-white/10 transition hover:scale-[1.02] hover:shadow-xl hover:ring-white/20 focus:opacity-90 sm:h-14 sm:px-6"
      aria-label="Télécharger sur l’App Store"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className="h-8 w-8 shrink-0 fill-white"
        aria-hidden
      >
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c1.12 0 2.08.74 2.6 1.9-.7.03-1.58-.48-2.1-1.25-.47-.72-.67-1.65-.5-2.65.58.03 1.17.25 1.6.99" />
      </svg>
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-medium text-white/90 sm:text-xs">
          Télécharger dans
        </span>
        <span className="text-base font-semibold text-white sm:text-lg">
          l’App Store
        </span>
      </div>
    </a>
  );
}

/** Badge Google Play — image officielle Google */
function GooglePlayBadge() {
  return (
    <a
      href={playStoreUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-block transition hover:scale-[1.02] focus:opacity-90"
      aria-label="Disponible sur Google Play"
    >
      <img
        src={GOOGLE_PLAY_BADGE_URL}
        alt="Disponible sur Google Play"
        className="h-12 w-auto rounded-lg object-contain shadow-lg shadow-black/25 ring-1 ring-white/10 transition group-hover:shadow-xl group-hover:ring-white/20 sm:h-14"
        width={158}
        height={60}
      />
    </a>
  );
}

export function StoreBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 ${className}`}>
      <AppStoreBadge />
      <GooglePlayBadge />
    </div>
  );
}
