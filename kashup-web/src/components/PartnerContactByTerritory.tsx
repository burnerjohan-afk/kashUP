'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Clock, Phone, Globe, ExternalLink } from 'lucide-react';
import { InstagramIcon } from './InstagramIcon';
import { FacebookIcon } from './FacebookIcon';
import type { Partner } from '../lib/api';

type TerritoryKey = 'Martinique' | 'Guadeloupe' | 'Guyane';

const TERRITORY_OPTIONS: TerritoryKey[] = ['Martinique', 'Guadeloupe', 'Guyane'];

function getTerritoryFromCoords(lat: number, lng: number): TerritoryKey | null {
  const MARTINIQUE = { latMin: 14.35, latMax: 14.95, lngMin: -61.25, lngMax: -60.75 };
  const GUADELOUPE = { latMin: 15.75, latMax: 16.55, lngMin: -61.85, lngMax: -61.0 };
  const GUYANE = { latMin: 2.0, latMax: 6.0, lngMin: -54.5, lngMax: -51.5 };
  const inBounds = (x: number, y: number, b: typeof MARTINIQUE) =>
    x >= b.latMin && x <= b.latMax && y >= b.lngMin && y <= b.lngMax;
  if (inBounds(lat, lng, MARTINIQUE)) return 'Martinique';
  if (inBounds(lat, lng, GUADELOUPE)) return 'Guadeloupe';
  if (inBounds(lat, lng, GUYANE)) return 'Guyane';
  return null;
}

function mapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

type Props = { partner: Partner };

export function PartnerContactByTerritory({ partner }: Props) {
  const territories = useMemo(() => {
    const list = partner.territories?.length
      ? partner.territories.map((t) => String(t).charAt(0).toUpperCase() + String(t).slice(1).toLowerCase())
      : ['Martinique'];
    return TERRITORY_OPTIONS.filter((t) => list.some((pt) => pt.toLowerCase() === t.toLowerCase())) as TerritoryKey[];
  }, [partner.territories]);

  const [selectedTerritory, setSelectedTerritory] = useState<TerritoryKey | null>(null);

  useEffect(() => {
    if (territories.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const t = getTerritoryFromCoords(pos.coords.latitude, pos.coords.longitude);
          if (t && territories.includes(t)) setSelectedTerritory(t);
          else setSelectedTerritory(territories[0]);
        },
        () => setSelectedTerritory(territories[0]),
        { timeout: 5000, maximumAge: 300000 }
      );
    } else {
      setSelectedTerritory(territories[0]);
    }
  }, [territories]);

  const display = useMemo(() => {
    const dept = selectedTerritory ?? (territories[0] ?? 'Martinique');
    const details = partner.territoryDetails?.[dept];
    return {
      address: (details?.address?.trim() && details.address) || partner.address || '',
      websiteUrl: (details?.websiteUrl?.trim() && details.websiteUrl) || partner.websiteUrl || '',
      facebookUrl: (details?.facebookUrl?.trim() && details.facebookUrl) || partner.facebookUrl || '',
      instagramUrl: (details?.instagramUrl?.trim() && details.instagramUrl) || partner.instagramUrl || '',
    };
  }, [partner, selectedTerritory, territories]);

  const hasLocation = typeof partner.latitude === 'number' && typeof partner.longitude === 'number';

  if (territories.length === 0) return null;

  return (
    <>
      {territories.length > 1 && (
        <div className="border-b border-slate-100 p-6">
          <p className="text-xs font-semibold uppercase text-slate-500">Département</p>
          <p className="mt-0.5 text-sm text-slate-600">
            Choisissez le département pour afficher l&apos;adresse et les réseaux correspondants.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {territories.map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedTerritory(dept)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedTerritory === dept
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Infos pratiques */}
      <div className="grid gap-6 border-b border-slate-100 p-6 sm:grid-cols-2">
        {display.address && (
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <MapPin className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Adresse</p>
              <p className="mt-0.5 text-slate-700">{display.address}</p>
            </div>
          </div>
        )}
        {partner.openingHours && (
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Clock className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Horaires</p>
              <p className="mt-0.5 whitespace-pre-line text-slate-700">{partner.openingHours}</p>
            </div>
          </div>
        )}
        {partner.phone && (
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Phone className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Téléphone</p>
              <a
                href={`tel:${partner.phone.replace(/\s/g, '')}`}
                className="mt-0.5 block font-medium text-[var(--primary)] hover:underline"
              >
                {partner.phone}
              </a>
            </div>
          </div>
        )}
        {hasLocation && (
          <div className="flex gap-3 sm:col-span-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <MapPin className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Localisation</p>
              <a
                href={mapUrl(partner.latitude!, partner.longitude!)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 font-medium text-[var(--primary)] hover:underline"
              >
                Voir sur la carte
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Réseaux sociaux + site */}
      {(display.websiteUrl || display.instagramUrl || display.facebookUrl) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-6">
          {display.websiteUrl && (
            <a
              href={display.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow"
            >
              <Globe className="h-5 w-5 text-slate-500" aria-hidden />
              Site web
            </a>
          )}
          {display.instagramUrl && (
            <a
              href={display.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 hover:shadow-lg"
              style={{
                background:
                  'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
              }}
            >
              <InstagramIcon className="h-5 w-5" variant="white" />
              Instagram
            </a>
          )}
          {display.facebookUrl && (
            <a
              href={display.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#166fe5] hover:shadow-lg"
            >
              <FacebookIcon className="h-5 w-5 text-white" />
              Facebook
            </a>
          )}
        </div>
      )}
    </>
  );
}
