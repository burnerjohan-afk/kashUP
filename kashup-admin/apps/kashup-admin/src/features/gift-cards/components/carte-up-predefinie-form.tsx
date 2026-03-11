import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchPartners } from '@/features/partners/api';
import { API_CONFIG } from '@/config/api';
import { createCarteUpPredefinie, updateCarteUpPredefinie } from '../api-cartes-up';
import type { CarteUpPredefinie } from '@/types/gifts';

const buildImageUrl = (url: string | null | undefined): string | null => {
  if (!url || !url.trim()) return null;
  if (url.startsWith('http')) return url;
  const base = API_CONFIG.baseOrigin?.replace(/\/$/, '') || '';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

type FormState = {
  nom: string;
  partenaireId: string;
  offre: string;
  montant: number;
  description: string;
  dureeValiditeJours: number;
  conditions: string;
  commentCaMarche: string;
  cashbackRate: number | '';
  status: 'active' | 'inactive';
  imageFile?: File;
  imageUrl?: string;
};

const defaultForm: FormState = {
  nom: '',
  partenaireId: '',
  offre: '',
  montant: 0,
  description: '',
  dureeValiditeJours: 365,
  conditions: '',
  commentCaMarche: '',
  cashbackRate: '',
  status: 'active',
};

type CarteUpPredefinieFormProps = {
  carte?: CarteUpPredefinie;
  onSuccess?: () => void;
};

export const CarteUpPredefinieForm = ({ carte, onSuccess }: CarteUpPredefinieFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners({}),
  });

  useEffect(() => {
    if (carte) {
      setForm({
        nom: carte.nom ?? '',
        partenaireId: carte.partenaireId ?? '',
        offre: carte.offre ?? '',
        montant: carte.montant ?? 0,
        description: carte.description ?? '',
        dureeValiditeJours: carte.dureeValiditeJours ?? 365,
        conditions: carte.conditions ?? '',
        commentCaMarche: carte.commentCaMarche ?? '',
        cashbackRate: carte.cashbackRate != null ? carte.cashbackRate : '',
        status: (carte.status as 'active' | 'inactive') ?? 'active',
        imageUrl: carte.imageUrl ?? undefined,
      });
      setImagePreview(carte.imageUrl ? buildImageUrl(carte.imageUrl) : null);
    } else {
      setForm(defaultForm);
      setImagePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [carte?.id, carte?.nom, carte?.partenaireId, carte?.imageUrl]);

  const buildFormData = (): FormData => {
    const fd = new FormData();
    fd.append('nom', form.nom);
    fd.append('partenaireId', form.partenaireId);
    if (form.offre) fd.append('offre', form.offre);
    fd.append('montant', String(form.montant));
    fd.append('description', form.description);
    fd.append('dureeValiditeJours', String(form.dureeValiditeJours));
    fd.append('conditions', form.conditions);
    fd.append('commentCaMarche', form.commentCaMarche);
    if (form.cashbackRate !== '' && form.cashbackRate != null) {
      fd.append('cashbackRate', String(form.cashbackRate));
    }
    fd.append('status', form.status);
    // Image : même logique que home-banners
    if (form.imageFile) {
      const name = form.imageFile.name && /\.(jpe?g|png|gif|webp)$/i.test(form.imageFile.name)
        ? form.imageFile.name
        : 'image.jpg';
      fd.append('image', form.imageFile, name);
    } else if (form.imageUrl != null && String(form.imageUrl).trim() !== '') {
      fd.append('imageUrl', String(form.imageUrl).trim());
    }
    return fd;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, imageFile: file }));
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.nom?.trim()) e.nom = 'Le nom est obligatoire';
    if (!form.partenaireId?.trim()) e.partenaireId = 'Le partenaire est obligatoire';
    if (!(form.montant > 0)) e.montant = 'Le montant doit être positif';
    if (!form.description?.trim()) e.description = 'La description est obligatoire';
    if (!carte && !form.imageFile) e.image = 'L\'image est obligatoire à la création';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => createCarteUpPredefinie(fd),
    onSuccess: () => {
      toast.success('Carte UP créée avec succès');
      setForm(defaultForm);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.();
    },
    onError: () => toast.error('Impossible de créer la carte'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, fd }: { id: string; fd: FormData }) => updateCarteUpPredefinie(id, fd),
    onSuccess: () => {
      toast.success('Carte UP mise à jour avec succès');
      onSuccess?.();
    },
    onError: () => toast.error('Impossible de mettre à jour la carte'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (carte) {
      updateMutation.mutate({ id: carte.id, fd: buildFormData() });
    } else {
      createMutation.mutate(buildFormData());
    }
  };

  return (
    <Card title={carte ? 'Modifier la Carte UP' : 'Créer une Carte UP'}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Nom *</label>
          <Input
            placeholder="Ex: Carte UP Spa Relaxation"
            value={form.nom}
            onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
          />
          {errors.nom && <p className="mt-1 text-xs text-red-500">{errors.nom}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Partenaire *</label>
          <Select
            value={form.partenaireId}
            onChange={(e) => setForm((prev) => ({ ...prev, partenaireId: e.target.value }))}
          >
            <option value="">Sélectionner un partenaire</option>
            {(partnersQuery.data?.partners ?? []).map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </Select>
          {errors.partenaireId && <p className="mt-1 text-xs text-red-500">{errors.partenaireId}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Offre (optionnel)</label>
          <Input
            placeholder="Ex: Massage 1h + accès SPA"
            value={form.offre}
            onChange={(e) => setForm((prev) => ({ ...prev, offre: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Montant (€) *</label>
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="50"
            value={form.montant || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, montant: Number(e.target.value) || 0 }))}
          />
          {errors.montant && <p className="mt-1 text-xs text-red-500">{errors.montant}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Taux de cashback (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            placeholder="Ex: 5"
            value={form.cashbackRate === '' ? '' : form.cashbackRate}
            onChange={(e) => {
              const v = e.target.value;
              setForm((prev) => ({ ...prev, cashbackRate: v === '' ? '' : Number(v) }));
            }}
          />
          <p className="mt-1 text-xs text-ink/50">Pourcentage de cashback accordé à l&apos;achat de cette carte (optionnel).</p>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Description *</label>
          <Textarea
            rows={3}
            placeholder="Description détaillée de l'offre..."
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Image {carte ? '(laisser vide pour conserver)' : '*'}</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Choisir une image
          </Button>
          {(imagePreview || (form.imageUrl && buildImageUrl(form.imageUrl))) && (
            <div className="mt-2">
              <img
                src={imagePreview || buildImageUrl(form.imageUrl ?? '') || ''}
                alt="Aperçu de l'image de la carte"
                className="h-32 w-full rounded-lg object-cover border border-ink/10"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          {errors.image && <p className="mt-1 text-xs text-red-500">{errors.image}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Durée de validité (jours) *</label>
          <Input
            type="number"
            min={1}
            placeholder="365"
            value={form.dureeValiditeJours || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, dureeValiditeJours: Number(e.target.value) || 365 }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Conditions</label>
          <Textarea
            rows={4}
            placeholder="Conditions d'utilisation..."
            value={form.conditions}
            onChange={(e) => setForm((prev) => ({ ...prev, conditions: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Comment ça marche</label>
          <Textarea
            rows={4}
            placeholder="Explication du fonctionnement..."
            value={form.commentCaMarche}
            onChange={(e) => setForm((prev) => ({ ...prev, commentCaMarche: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Statut *</label>
          <Select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
          >
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {carte ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
