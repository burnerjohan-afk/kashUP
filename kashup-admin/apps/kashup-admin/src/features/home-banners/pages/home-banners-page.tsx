import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  fetchHomeBanners,
  createHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,
  type HomeBanner,
  type HomeBannerFormInput,
} from '../api';
import { normalizeImageUrl } from '@/lib/utils/normalizeUrl';

export const HomeBannersPage = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HomeBannerFormInput & { imageFile?: File; videoFile?: File }>({
    title: '',
    mediaType: 'image',
    imageUrl: '',
    videoUrl: '',
    linkUrl: '',
    position: 0,
    active: true,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const bannersQuery = useQuery({
    queryKey: ['home-banners'],
    queryFn: fetchHomeBanners,
  });

  const createMutation = useMutation({
    mutationFn: (fd: FormData) => createHomeBanner(fd),
    onSuccess: () => {
      toast.success('Bannière créée');
      queryClient.invalidateQueries({ queryKey: ['home-banners'] });
      resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, fd }: { id: string; fd: FormData }) => updateHomeBanner(id, fd),
    onSuccess: () => {
      toast.success('Bannière mise à jour');
      queryClient.invalidateQueries({ queryKey: ['home-banners'] });
      setEditingId(null);
      resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHomeBanner,
    onSuccess: () => {
      toast.success('Bannière supprimée');
      queryClient.invalidateQueries({ queryKey: ['home-banners'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
  });

  const resetForm = () => {
    setForm({
      title: '',
      mediaType: 'image',
      imageUrl: '',
      videoUrl: '',
      linkUrl: '',
      position: 0,
      active: true,
    });
    setImagePreview(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    if (form.title !== undefined) fd.append('title', form.title);
    fd.append('mediaType', form.mediaType ?? 'image');
    if (form.imageFile) fd.append('image', form.imageFile);
    else if (form.imageUrl) fd.append('imageUrl', form.imageUrl);
    if (form.videoFile) fd.append('video', form.videoFile);
    else if (form.videoUrl) fd.append('videoUrl', form.videoUrl);
    if (form.linkUrl) fd.append('linkUrl', form.linkUrl);
    fd.append('position', String(form.position ?? 0));
    fd.append('active', form.active !== false ? 'true' : 'false');
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

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setForm((prev) => ({ ...prev, videoFile: file }));
  };

  const startEdit = (b: HomeBanner) => {
    setEditingId(b.id);
    setForm({
      title: b.title ?? '',
      mediaType: b.mediaType,
      imageUrl: b.imageUrl ?? '',
      videoUrl: b.videoUrl ?? '',
      linkUrl: b.linkUrl ?? '',
      position: b.position,
      active: b.active,
    });
    setImagePreview(b.imageUrl ? normalizeImageUrl(b.imageUrl) : null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(buildFormData());
  };

  const submitUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, fd: buildFormData() });
  };

  const banners = bannersQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Publicité page d'accueil</h1>
        <p className="text-sm text-ink/60 mt-1">
          Bannières affichées sous la carte cashback/points, avec défilement horizontal (images ou vidéos).
        </p>
      </div>

      <Card title="Ajouter une bannière" description="Image ou vidéo, lien optionnel, ordre d'affichage">
        <form
          onSubmit={editingId ? submitUpdate : submitCreate}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Titre (optionnel)</label>
            <Input
              value={form.title ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Offre du moment"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Type</label>
            <select
              value={form.mediaType ?? 'image'}
              onChange={(e) => setForm((prev) => ({ ...prev, mediaType: e.target.value as 'image' | 'video' }))}
              className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm"
            >
              <option value="image">Image</option>
              <option value="video">Vidéo</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Image (obligatoire pour affichage)</label>
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
            {form.mediaType === 'video' && (
              <div className="mt-2">
                <label className="mb-1 block text-xs uppercase text-ink/50">Vidéo (fichier)</label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
                  className="hidden"
                  onChange={handleVideoChange}
                />
                <Button type="button" variant="secondary" onClick={() => videoInputRef.current?.click()}>
                  Choisir une vidéo
                </Button>
                {form.videoFile && (
                  <p className="mt-2 text-sm text-ink/70">{form.videoFile.name}</p>
                )}
              </div>
            )}
            {(imagePreview || form.imageUrl) && (
              <div className="mt-2">
                <img
                  src={imagePreview || normalizeImageUrl(form.imageUrl ?? '') || ''}
                  alt="Aperçu"
                  className="h-24 w-auto rounded-lg border border-ink/10 object-cover"
                />
              </div>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Lien au clic (optionnel)</label>
            <Input
              value={form.linkUrl ?? ''}
              onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase text-ink/50">Position (ordre)</label>
            <Input
              type="number"
              min={0}
              value={form.position ?? 0}
              onChange={(e) => setForm((prev) => ({ ...prev, position: Number(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active !== false}
              onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            <label htmlFor="active">Active (visible sur l'app)</label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Enregistrer' : 'Créer la bannière'}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={() => { setEditingId(null); resetForm(); }}>
                Annuler
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Bannières existantes">
        {bannersQuery.isLoading ? (
          <p className="text-sm text-ink/60">Chargement...</p>
        ) : banners.length === 0 ? (
          <p className="text-sm text-ink/60">Aucune bannière. Créez-en une ci-dessus.</p>
        ) : (
          <ul className="space-y-3">
            {banners.map((b) => (
              <li
                key={b.id}
                className="flex items-center gap-4 rounded-lg border border-ink/10 p-3"
              >
                {b.imageUrl && (
                  <img
                    src={normalizeImageUrl(b.imageUrl) ?? ''}
                    alt={b.title ?? 'Bannière'}
                    className="h-14 w-24 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">{b.title || 'Sans titre'}</p>
                  <p className="text-xs text-ink/50">
                    {b.mediaType} • Position {b.position} • {b.active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => startEdit(b)}>
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-red-600"
                    onClick={() => window.confirm('Supprimer cette bannière ?') && deleteMutation.mutate(b.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
