import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { fetchPartners } from '@/features/partners/api';

/** Macarons proposés pour la Carte Sélection UP (dont pastille libre) */
export const MACARONS_CARTE_SELECTION = [
  'Joyeux anniversaire',
  'Plaisir d\'offrir',
  'Bonne fête',
  'Félicitations',
  'Bonne fête maman',
  'Bonne fête papa',
  'Joyeuse Saint-Valentin',
  'Bonne fête mamie',
  'Bonne fête papi',
  'Pastille libre',
] as const;

/** 3 polices pour la carte */
export const FONT_OPTIONS = [
  { id: 'dancing', label: 'Dancing Script (festive)', value: '"Dancing Script", "Comic Sans MS", cursive' },
  { id: 'georgia', label: 'Georgia (élégante)', value: 'Georgia, "Times New Roman", serif' },
  { id: 'segoe', label: 'Segoe Print (décontractée)', value: '"Segoe Print", "Bradley Hand", cursive' },
] as const;

/** Couleurs prédéfinies pour le texte */
const TEXT_COLORS = [
  { id: 'noir', label: 'Noir', value: '#1a1a2e' },
  { id: 'bleu', label: 'Bleu foncé', value: '#1e3a5f' },
  { id: 'bordeaux', label: 'Bordeaux', value: '#6b2d3c' },
  { id: 'vert', label: 'Vert forêt', value: '#1b4332' },
  { id: 'violet', label: 'Violet', value: '#3d2464' },
];

/** Couleurs prédéfinies pour le macaron */
const MACARON_COLORS = [
  { id: 'primary', label: 'Primaire', value: 'var(--color-primary, #05A357)' },
  { id: 'rouge', label: 'Rouge', value: '#c41e3a' },
  { id: 'or', label: 'Or', value: '#b8860b' },
  { id: 'violet', label: 'Violet', value: '#6f42c1' },
  { id: 'bleu', label: 'Bleu', value: '#0d6efd' },
  { id: 'vert', label: 'Vert', value: '#198754' },
];

/** Couleurs de fond de la carte */
const BACKGROUND_COLORS = [
  { id: 'blanc', label: 'Blanc', value: '#ffffff' },
  { id: 'creme', label: 'Crème', value: '#fef9e7' },
  { id: 'gris', label: 'Gris clair', value: '#f5f5f5' },
  { id: 'bleu', label: 'Bleu très clair', value: '#e8f4fd' },
  { id: 'rose', label: 'Rose très clair', value: '#fce4ec' },
  { id: 'lavande', label: 'Lavande clair', value: '#ede7f6' },
];

export const CarteTestPreview = () => {
  const [partenaireId, setPartenaireId] = useState('');
  const [montant, setMontant] = useState('');
  const [texte, setTexte] = useState('');
  const [macaron, setMacaron] = useState<string>(MACARONS_CARTE_SELECTION[0]);
  const [pastilleLibreTexte, setPastilleLibreTexte] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fontId, setFontId] = useState<string>(FONT_OPTIONS[0].id);
  const [textColorId, setTextColorId] = useState<string>(TEXT_COLORS[0].id);
  const [macaronColorId, setMacaronColorId] = useState<string>(MACARON_COLORS[0].id);
  const [backgroundColorId, setBackgroundColorId] = useState<string>(BACKGROUND_COLORS[0].id);

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners({}),
  });

  const partners = partnersQuery.data?.partners ?? [];
  const partenaire = partners.find((p) => p.id === partenaireId);

  const fontStyle = FONT_OPTIONS.find((f) => f.id === fontId)?.value ?? FONT_OPTIONS[0].value;
  const textColor = TEXT_COLORS.find((c) => c.id === textColorId)?.value ?? TEXT_COLORS[0].value;
  const macaronColor = MACARON_COLORS.find((c) => c.id === macaronColorId)?.value ?? MACARON_COLORS[0].value;
  const backgroundColor = BACKGROUND_COLORS.find((c) => c.id === backgroundColorId)?.value ?? BACKGROUND_COLORS[0].value;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  return (
    <Card
      title="Carte test"
      description="Prévisualisez le rendu d'une Carte Sélection UP (partenaire, montant, texte, image, macaron)."
    >
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Partenaire</label>
            <Select value={partenaireId} onChange={(e) => setPartenaireId(e.target.value)}>
              <option value="">Sélectionner un partenaire</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Montant (€)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="20"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Texte</label>
            <Textarea
              rows={3}
              placeholder="Message personnalisé..."
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Image</label>
            <Input type="file" accept="image/*" onChange={handleImageChange} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Macaron</label>
            <Select value={macaron} onChange={(e) => setMacaron(e.target.value)}>
              {MACARONS_CARTE_SELECTION.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            {macaron === 'Pastille libre' && (
              <div className="mt-2">
                <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Texte du macaron (pastille libre)</label>
                <Input
                  placeholder="Ex : Merci pour tout, Bonne retraite..."
                  value={pastilleLibreTexte}
                  onChange={(e) => setPastilleLibreTexte(e.target.value)}
                />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Couleur du macaron</label>
            <Select value={macaronColorId} onChange={(e) => setMacaronColorId(e.target.value)}>
              {MACARON_COLORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Couleur du texte</label>
            <Select value={textColorId} onChange={(e) => setTextColorId(e.target.value)}>
              {TEXT_COLORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Police</label>
            <Select value={fontId} onChange={(e) => setFontId(e.target.value)}>
              {FONT_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-ink/50">Couleur du fond de la carte</label>
            <Select value={backgroundColorId} onChange={(e) => setBackgroundColorId(e.target.value)}>
              {BACKGROUND_COLORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="rounded-xl border border-ink/15 bg-muted/20 p-6">
          <p className="mb-4 text-xs font-semibold uppercase text-ink/50">Aperçu du rendu</p>
          <div
            className="mx-auto max-w-sm overflow-hidden rounded-xl border border-ink/10 shadow-lg"
            style={{ backgroundColor }}
          >
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="h-36 w-full object-cover"
              />
            )}
            {!imagePreview && (
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-ink/40">
                Image
              </div>
            )}
            <div className="relative p-5">
              {partenaire?.logoUrl && (
                <div className="absolute -top-6 right-4 h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
                  <img
                    src={partenaire.logoUrl}
                    alt={partenaire.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
              <p
                className="text-lg leading-snug italic"
                style={{
                  fontFamily: fontStyle,
                  fontWeight: 600,
                  color: textColor,
                }}
              >
                Profite des{' '}
                <span style={{ fontSize: '1.15em', fontWeight: 800 }}>
                  {montant ? `${montant} €` : '…'}
                </span>{' '}
                chez{' '}
                <span style={{ fontWeight: 800, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                  {partenaire?.name ?? '…'}
                </span>
              </p>
              {texte && (
                <p
                  className="mt-3 text-sm whitespace-pre-wrap"
                  style={{ fontFamily: fontStyle, fontWeight: 500, color: textColor }}
                >
                  {texte}
                </p>
              )}
              {macaron && (
                <span
                  className="mt-3 inline-block rounded-full px-3 py-1.5 text-sm font-semibold"
                  style={{
                    fontFamily: fontStyle,
                    backgroundColor: macaronColor,
                    color: '#fff',
                  }}
                >
                  {macaron === 'Pastille libre' ? (pastilleLibreTexte.trim() || 'Votre texte') : macaron}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
