# Migration des anciens uploads vers Vercel Blob

Ce document décrit comment migrer les fichiers uploads stockés localement (ou dans une sauvegarde) vers Vercel Blob et mettre à jour les URLs en base de données.

## Prérequis

- **Dossier local** contenant les uploads avec la même structure que `uploads/` (ex. `uploads/partners/<id>/logo.jpg`, `uploads/offers/...`, etc.). Si tu as une sauvegarde, place-la quelque part et indique son chemin.
- **`.env`** avec :
  - `BLOB_READ_WRITE_TOKEN` (token du Blob Store Vercel)
  - `DATABASE_URL` (PostgreSQL, ex. Neon)

## Usage

Depuis la racine de `kashup-api` :

```bash
# Dossier par défaut : ./uploads
npm run migrate:uploads-to-blob

# Ou en passant le chemin explicite (backup, autre disque, etc.)
npx tsx scripts/migrate-uploads-to-blob.ts "C:\backup\kashup-uploads"
```

## Comportement

1. Parcourt récursivement le dossier fourni.
2. Pour chaque fichier, envoie le contenu vers Vercel Blob (path `uploads/...`).
3. Récupère en base les enregistrements dont les champs image/logo pointent vers `/uploads/...` (ou une URL complète contenant `/uploads/`).
4. Remplace ces URLs par les nouvelles URLs Blob dans :
   - Partner (logoUrl, menuImages, photos)
   - PartnerOffer (imageUrl)
   - HomeBanner (imageUrl, videoUrl)
   - GiftBox, CarteUpLibreConfig, CarteUpPredefinie, PredefinedGift
   - DonationAssociation (logoUrl)
   - Lottery, GiftCardConfig, BoxUpConfig
   - PartnerDocument (url)

## Note

Si tu n’as **pas** de sauvegarde des anciens fichiers, ils ne peuvent pas être récupérés (ils étaient dans `/tmp` sur Vercel, effacés après chaque invocation). Dans ce cas, il faut re-uploader les images manuellement via le back office.
