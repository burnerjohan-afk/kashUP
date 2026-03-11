import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchPartners } from '@/features/partners/api';
import { normalizeImageUrl } from '@/lib/utils/normalizeUrl';
import { createBoxUp, updateBoxUp, type BoxUpUpdatePayload } from '../api-box-up';
import type { BoxUp, BoxUpInput, BoxUpPartner } from '@/types/gifts';


type BoxUpFormProps = {
  box?: BoxUp;
  onSuccess?: () => void;
};

export const BoxUpForm = ({ box, onSuccess }: BoxUpFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [partenaires, setPartenaires] = useState<BoxUpPartner[]>(
    box?.partenaires || []
  );

  useEffect(() => {
    if (box?.imageUrl) {
      setImagePreview(normalizeImageUrl(box.imageUrl) ?? null);
    } else {
      setImagePreview(null);
    }
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [box?.id, box?.imageUrl]);

  const partnersQuery = useQuery({
    queryKey: ['partners'],
    queryFn: () => fetchPartners({}),
  });

  const [formData, setFormData] = useState({
    nom: box?.nom || '',
    description: box?.description || '',
    commentCaMarche: box?.commentCaMarche || '',
    cashbackRate: box?.cashbackRate ?? ('' as number | ''),
    status: (box?.status || 'active') as 'active' | 'inactive',
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addPartner = () => {
    setPartenaires([...partenaires, { partenaireId: '', offrePartenaire: '', conditions: '' }]);
  };

  const removePartner = (index: number) => {
    setPartenaires(partenaires.filter((_, i) => i !== index));
  };

  const updatePartner = (index: number, field: keyof BoxUpPartner, value: string) => {
    const updated = [...partenaires];
    updated[index] = { ...updated[index], [field]: value };
    setPartenaires(updated);
  };

  const createMutation = useMutation({
    mutationFn: createBoxUp,
    onSuccess: () => {
      toast.success('Box Up créée avec succès');
      setFormData({ nom: '', description: '', commentCaMarche: '', cashbackRate: '', status: 'active' });
      setPartenaires([]);
      setImagePreview(null);
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess?.();
    },
    onError: () => toast.error('Impossible de créer la box'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BoxUpUpdatePayload }) =>
      updateBoxUp(id, payload),
    onSuccess: () => {
      toast.success('Box Up mise à jour avec succès');
      onSuccess?.();
    },
    onError: () => toast.error('Impossible de mettre à jour la box'),
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.nom || !formData.description) {
      toast.error('Le nom et la description sont obligatoires');
      return;
    }

    if (partenaires.length === 0) {
      toast.error('Au moins un partenaire doit être ajouté');
      return;
    }

    for (const partner of partenaires) {
      if (!partner.partenaireId || !partner.offrePartenaire) {
        toast.error('Tous les partenaires doivent avoir un partenaire sélectionné et une offre');
        return;
      }
    }

    const payload: BoxUpUpdatePayload = {
      ...formData,
      partenaires: partenaires.map((p) => ({
        ...p,
        partenaireName: partnersQuery.data?.partners.find((partner) => partner.id === p.partenaireId)
          ?.name,
      })),
    };

    if (imageFile) {
      payload.image = imageFile;
    } else if (box?.imageUrl) {
      payload.imageUrl = box.imageUrl;
    }

    if (box) {
      updateMutation.mutate({ id: box.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Card title={box ? 'Modifier la Box Up' : 'Créer une Box Up'}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Nom *</label>
          <Input
            placeholder="Ex: Box Up Découverte"
            value={formData.nom}
            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Description *</label>
          <Textarea
            rows={3}
            placeholder="Description de la box..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Image {box ? '(laisser vide pour conserver)' : ''}</label>
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
          {(imagePreview || (box?.imageUrl && normalizeImageUrl(box.imageUrl))) && (
            <div className="mt-2">
              <img
                src={imagePreview || normalizeImageUrl(box?.imageUrl ?? '') || ''}
                alt="Aperçu"
                className="h-32 w-full rounded-lg object-cover border border-ink/10"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-xs uppercase text-ink/50">Partenaires *</label>
            <Button type="button" variant="secondary" onClick={addPartner}>
              Ajouter un partenaire
            </Button>
          </div>
          <div className="space-y-3">
            {partenaires.map((partner, index) => (
              <div key={index} className="rounded-lg border border-ink/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">Partenaire {index + 1}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removePartner(index)}
                  >
                    Supprimer
                  </Button>
                </div>
                <Select
                  value={partner.partenaireId}
                  onChange={(e) => updatePartner(index, 'partenaireId', e.target.value)}
                  required
                >
                  <option value="">Sélectionner un partenaire</option>
                  {(partnersQuery.data?.partners ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Input
                  placeholder="Offre (ex: 1 menu signature)"
                  value={partner.offrePartenaire}
                  onChange={(e) => updatePartner(index, 'offrePartenaire', e.target.value)}
                  required
                />
                <Textarea
                  rows={2}
                  placeholder="Conditions spécifiques (optionnel)"
                  value={partner.conditions || ''}
                  onChange={(e) => updatePartner(index, 'conditions', e.target.value)}
                />
              </div>
            ))}
            {partenaires.length === 0 && (
              <p className="text-sm text-ink/50 text-center py-4">
                Aucun partenaire ajouté. Cliquez sur "Ajouter un partenaire" pour commencer.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Comment ça marche</label>
          <Textarea
            rows={4}
            placeholder="Explication du fonctionnement..."
            value={formData.commentCaMarche}
            onChange={(e) => setFormData({ ...formData, commentCaMarche: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Taux de cashback (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.5}
            placeholder="Ex: 5"
            value={formData.cashbackRate === '' ? '' : formData.cashbackRate}
            onChange={(e) => {
              const v = e.target.value;
              setFormData((prev) => ({ ...prev, cashbackRate: v === '' ? ('' as const) : Number(v) }));
            }}
          />
          <p className="mt-1 text-xs text-ink/50">Pourcentage de cashback accordé à l&apos;achat de cette box (optionnel).</p>
        </div>

        <div>
          <label className="mb-1 block text-xs uppercase text-ink/50">Statut *</label>
          <Select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
            }
          >
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending}>
            {box ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

