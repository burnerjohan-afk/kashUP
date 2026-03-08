/**
 * Migration des fichiers uploads locaux vers Vercel Blob et mise à jour des URLs en base.
 *
 * Prérequis:
 * - Dossier local contenant les uploads (ex: kashup-api/uploads ou backup)
 * - BLOB_READ_WRITE_TOKEN dans .env (token Vercel Blob)
 * - DATABASE_URL dans .env (PostgreSQL)
 *
 * Usage:
 *   npx tsx scripts/migrate-uploads-to-blob.ts [CHEMIN_VERS_UPLOADS]
 *   Par défaut: ./uploads (depuis la racine kashup-api)
 *
 * Comportement:
 * 1. Parcourt récursivement le dossier uploads (partners, home-banners, offers, etc.)
 * 2. Envoie chaque fichier vers Vercel Blob (path: uploads/type/.../fichier)
 * 3. Récupère les enregistrements en base dont les champs image/logo pointent vers /uploads/...
 * 4. Remplace ces URLs par les nouvelles URLs Blob
 */

import path from 'path';
import fs from 'fs';
import { config } from 'dotenv';
import { put } from '@vercel/blob';
import { PrismaClient } from '@prisma/client';

// Option --token=xxx pour passer le token en ligne de commande (contourne .env)
const argv = process.argv.slice(2);
const tokenArg = argv.find((a) => a.startsWith('--token='));
if (tokenArg) {
  process.env.BLOB_READ_WRITE_TOKEN = tokenArg.slice('--token='.length).trim();
}
const uploadsArg = argv.filter((a) => !a.startsWith('--'))[0];

// Charger .env si le token n'est pas déjà fourni
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  const possibleEnvPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(process.cwd(), 'kashup-api', '.env'),
  ].filter((p) => fs.existsSync(p));
  for (const envPath of possibleEnvPaths) {
    config({ path: envPath });
    if (process.env.BLOB_READ_WRITE_TOKEN) break;
  }
  // Dernier recours : lecture manuelle de la ligne BLOB_READ_WRITE_TOKEN
  if (!process.env.BLOB_READ_WRITE_TOKEN && possibleEnvPaths.length > 0) {
    const content = fs.readFileSync(possibleEnvPaths[0], 'utf8');
    const match = content.match(/BLOB_READ_WRITE_TOKEN\s*=\s*["']?([^"\r\n]+)["']?/);
    if (match) process.env.BLOB_READ_WRITE_TOKEN = match[1].trim();
  }
}

const prisma = new PrismaClient();

const UPLOADS_DIR = uploadsArg
  ? path.resolve(uploadsArg)
  : path.join(__dirname, '..', 'uploads');

/** Normalise une URL stockée en base vers la forme /uploads/... pour le matching */
function normalizeOldUrl(url: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const t = url.trim();
  if (!t) return null;
  // Enlever protocole + host (http://localhost:4000, https://...)
  let p = t.replace(/^https?:\/\/[^/]+/i, '').trim();
  if (!p.startsWith('/')) p = '/' + p;
  if (!p.startsWith('/uploads/')) return null;
  return p;
}

/** Liste tous les fichiers sous un répertoire, chemins relatifs à baseDir */
function listFilesRecursive(dir: string, baseDir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(baseDir, full).replace(/\\/g, '/');
    if (e.isDirectory()) {
      out.push(...listFilesRecursive(full, baseDir));
    } else {
      out.push(rel);
    }
  }
  return out;
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('❌ BLOB_READ_WRITE_TOKEN manquant.');
    console.error('   Ajoute-le dans kashup-api/.env ou passe-le :');
    console.error('   npm run migrate:uploads-to-blob -- --token=vercel_blob_rw_XXX');
    process.exit(1);
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    console.error('❌ Dossier uploads introuvable:', UPLOADS_DIR);
    console.error('   Usage: npx tsx scripts/migrate-uploads-to-blob.ts [CHEMIN_VERS_UPLOADS]');
    process.exit(1);
  }

  console.log('📁 Dossier uploads:', UPLOADS_DIR);
  const allFiles = listFilesRecursive(UPLOADS_DIR, UPLOADS_DIR);
  console.log('   Fichiers trouvés:', allFiles.length);
  if (allFiles.length === 0) {
    console.log('   Rien à migrer.');
    return;
  }

  // 1) Upload chaque fichier vers Blob et construire la map oldPath -> blobUrl
  const oldPathToBlobUrl: Record<string, string> = {};
  for (const rel of allFiles) {
    const blobPath = rel.startsWith('uploads/') ? rel : `uploads/${rel}`;
    const fullPath = path.join(UPLOADS_DIR, rel);
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(rel).toLowerCase();
    const contentType =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.gif'
              ? 'image/gif'
              : ext === '.mp4'
                ? 'video/mp4'
                : ext === '.pdf'
                  ? 'application/pdf'
                  : undefined;
    const blob = await put(blobPath, buffer, {
      access: 'private',
      contentType,
    });
    const oldPath = '/' + blobPath.replace(/^\/+/, '');
    oldPathToBlobUrl[oldPath] = blob.url;
    console.log('   ✅', oldPath, '->', blob.url);
  }

  const replaceUrl = (url: string | null): string | null => {
    if (!url) return null;
    const norm = normalizeOldUrl(url);
    if (!norm) return url;
    return oldPathToBlobUrl[norm] ?? url;
  };

  // 2) Mise à jour des enregistrements en base
  let totalUpdated = 0;

  // Partner: logoUrl, menuImages, photos (JSON arrays)
  const partners = await prisma.partner.findMany({
    where: {
      OR: [{ logoUrl: { not: null } }, { menuImages: { not: null } }, { photos: { not: null } }],
    },
  });
  for (const p of partners) {
    let logoUrl = replaceUrl(p.logoUrl);
    let menuImages = p.menuImages;
    let photos = p.photos;
    if (menuImages) {
      try {
        const arr = JSON.parse(menuImages) as string[];
        if (Array.isArray(arr)) {
          const newArr = arr.map((u) => replaceUrl(u) ?? u);
          if (JSON.stringify(newArr) !== menuImages) menuImages = JSON.stringify(newArr);
        }
      } catch {
        // ignore
      }
    }
    if (photos) {
      try {
        const arr = JSON.parse(photos) as string[];
        if (Array.isArray(arr)) {
          const newArr = arr.map((u) => replaceUrl(u) ?? u);
          if (JSON.stringify(newArr) !== photos) photos = JSON.stringify(newArr);
        }
      } catch {
        // ignore
      }
    }
    if (logoUrl !== p.logoUrl || menuImages !== p.menuImages || photos !== p.photos) {
      await prisma.partner.update({
        where: { id: p.id },
        data: {
          ...(logoUrl !== p.logoUrl && { logoUrl }),
          ...(menuImages !== p.menuImages && { menuImages }),
          ...(photos !== p.photos && { photos }),
        },
      });
      totalUpdated++;
    }
  }
  console.log('   Partners:', totalUpdated, 'mis à jour');

  // PartnerOffer: imageUrl
  const offers = await prisma.partnerOffer.findMany({
    where: { imageUrl: { not: null } },
  });
  for (const o of offers) {
    const imageUrl = replaceUrl(o.imageUrl);
    if (imageUrl !== o.imageUrl) {
      await prisma.partnerOffer.update({
        where: { id: o.id },
        data: { imageUrl },
      });
      totalUpdated++;
    }
  }

  // HomeBanner: imageUrl, videoUrl
  const banners = await prisma.homeBanner.findMany({
    where: {
      OR: [{ imageUrl: { not: null } }, { videoUrl: { not: null } }],
    },
  });
  for (const b of banners) {
    const imageUrl = replaceUrl(b.imageUrl);
    const videoUrl = replaceUrl(b.videoUrl);
    if (imageUrl !== b.imageUrl || videoUrl !== b.videoUrl) {
      await prisma.homeBanner.update({
        where: { id: b.id },
        data: {
          ...(imageUrl !== b.imageUrl && { imageUrl }),
          ...(videoUrl !== b.videoUrl && { videoUrl }),
        },
      });
      totalUpdated++;
    }
  }

  // GiftBox: imageUrl
  const boxes = await prisma.giftBox.findMany({
    where: { imageUrl: { not: null } },
  });
  for (const b of boxes) {
    const imageUrl = replaceUrl(b.imageUrl);
    if (imageUrl !== b.imageUrl) {
      await prisma.giftBox.update({
        where: { id: b.id },
        data: { imageUrl },
      });
      totalUpdated++;
    }
  }

  // CarteUpLibreConfig: imageUrl
  const carteUpLibre = await prisma.carteUpLibreConfig.findMany({
    where: { imageUrl: { not: null } },
  });
  for (const c of carteUpLibre) {
    const imageUrl = replaceUrl(c.imageUrl);
    if (imageUrl !== c.imageUrl) {
      await prisma.carteUpLibreConfig.update({
        where: { id: c.id },
        data: { imageUrl },
      });
      totalUpdated++;
    }
  }

  // CarteUpPredefinie: imageUrl
  const carteUpPredef = await prisma.carteUpPredefinie.findMany({
    where: { imageUrl: { not: null } },
  });
  for (const c of carteUpPredef) {
    const imageUrl = replaceUrl(c.imageUrl);
    if (imageUrl !== c.imageUrl) {
      await prisma.carteUpPredefinie.update({
        where: { id: c.id },
        data: { imageUrl },
      });
      totalUpdated++;
    }
  }

  // PredefinedGift: imageUrl
  const predefinedGifts = await prisma.predefinedGift.findMany({
    where: { imageUrl: { not: null } },
  });
  for (const g of predefinedGifts) {
    const imageUrl = replaceUrl(g.imageUrl);
    if (imageUrl !== g.imageUrl) {
      await prisma.predefinedGift.update({
        where: { id: g.id },
        data: { imageUrl },
      });
      totalUpdated++;
    }
  }

  // DonationAssociation: logoUrl
  const associations = await prisma.donationAssociation.findMany({
    where: { logoUrl: { not: null } },
  });
  for (const a of associations) {
    const logoUrl = replaceUrl(a.logoUrl);
    if (logoUrl !== a.logoUrl) {
      await prisma.donationAssociation.update({
        where: { id: a.id },
        data: { logoUrl },
      });
      totalUpdated++;
    }
  }

  // Lottery: imageUrl
  const lotteries = await prisma.lottery.findMany({
    where: { imageUrl: { not: null } },
  });
  for (const l of lotteries) {
    const imageUrl = replaceUrl(l.imageUrl);
    if (imageUrl !== l.imageUrl) {
      await prisma.lottery.update({
        where: { id: l.id },
        data: { imageUrl },
      });
      totalUpdated++;
    }
  }

  // GiftCardConfig: giftCardImageUrl, giftCardVirtualCardImageUrl
  const giftCardConfigs = await prisma.giftCardConfig.findMany();
  for (const g of giftCardConfigs) {
    const giftCardImageUrl = replaceUrl(g.giftCardImageUrl);
    const giftCardVirtualCardImageUrl = replaceUrl(g.giftCardVirtualCardImageUrl);
    if (
      giftCardImageUrl !== g.giftCardImageUrl ||
      giftCardVirtualCardImageUrl !== g.giftCardVirtualCardImageUrl
    ) {
      await prisma.giftCardConfig.update({
        where: { id: g.id },
        data: {
          ...(giftCardImageUrl !== g.giftCardImageUrl && { giftCardImageUrl }),
          ...(giftCardVirtualCardImageUrl !== g.giftCardVirtualCardImageUrl && {
            giftCardVirtualCardImageUrl,
          }),
        },
      });
      totalUpdated++;
    }
  }

  // BoxUpConfig: boxUpImageUrl
  const boxUpConfigs = await prisma.boxUpConfig.findMany({
    where: { boxUpImageUrl: { not: null } },
  });
  for (const b of boxUpConfigs) {
    const boxUpImageUrl = replaceUrl(b.boxUpImageUrl);
    if (boxUpImageUrl !== b.boxUpImageUrl) {
      await prisma.boxUpConfig.update({
        where: { id: b.id },
        data: { boxUpImageUrl },
      });
      totalUpdated++;
    }
  }

  // PartnerDocument: url (tous, on ne met à jour que si on a une nouvelle URL)
  const docs = await prisma.partnerDocument.findMany();
  for (const d of docs) {
    const url = replaceUrl(d.url);
    if (url && url !== d.url) {
      await prisma.partnerDocument.update({
        where: { id: d.id },
        data: { url },
      });
      totalUpdated++;
    }
  }

  console.log('✅ Migration terminée. Enregistrements mis à jour:', totalUpdated);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
