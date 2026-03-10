import path from 'path';
import fs from 'fs';
import { put } from '@vercel/blob';
import { getFileUrl } from '../config/upload';

const isVercel = Boolean(process.env.VERCEL);
const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Utilise Vercel Blob dès que le token est défini (recommandé en prod pour loteries et rewards). */
function shouldUseBlob(): boolean {
  return hasBlobToken;
}

/**
 * Upload un fichier vers Vercel Blob.
 * Utilisé pour les images de loteries et rewards en production (persistant sur Vercel).
 * Retourne l'URL du Blob (privée, l'app passe par le proxy API pour l'affichage).
 */
async function uploadToBlob(
  file: Express.Multer.File,
  blobPath: string
): Promise<string> {
  const buffer = fs.readFileSync(file.path);
  const blob = await put(blobPath, buffer, {
    access: 'private',
    contentType: file.mimetype || undefined,
  });
  return blob.url;
}

/**
 * Traite un fichier uploadé et retourne son URL.
 * Si BLOB_READ_WRITE_TOKEN est défini : upload vers Vercel Blob (photos loteries, rewards, etc.).
 * Sinon : URL locale /uploads/...
 */
export async function processUploadedFile(
  file: Express.Multer.File | undefined,
  type: string = 'general',
  entityId?: string
): Promise<string | undefined> {
  if (!file) {
    return undefined;
  }

  if (shouldUseBlob()) {
    const blobPath =
      type === 'partners' && entityId
        ? `uploads/${type}/${entityId}/${file.filename}`
        : `uploads/${type}/${file.filename}`;
    try {
      const url = await uploadToBlob(file, blobPath);
      return url;
    } catch (err) {
      console.error('[upload] Erreur Blob:', err);
      throw err;
    }
  }

  let relativePath: string;
  if (type === 'partners' && entityId) {
    relativePath = path.join('uploads', type, entityId, file.filename);
  } else {
    relativePath = path.join('uploads', type, file.filename);
  }
  return getFileUrl(relativePath);
}

/**
 * Traite plusieurs fichiers uploadés
 */
export async function processUploadedFiles(
  files: Express.Multer.File[] | undefined,
  type: string = 'general',
  entityId?: string
): Promise<string[]> {
  if (!files || files.length === 0) {
    return [];
  }
  return Promise.all(
    files.map((file) => processUploadedFile(file, type, entityId))
  ).then((urls) => urls.filter((u): u is string => u != null));
}

/**
 * Extrait les fichiers d'une requête multer
 */
export const extractFiles = (req: any): {
  single?: Express.Multer.File;
  multiple?: Express.Multer.File[];
  fields?: { [fieldname: string]: Express.Multer.File[] };
} => {
  return {
    single: req.file,
    multiple: req.files as Express.Multer.File[],
    fields: req.files as { [fieldname: string]: Express.Multer.File[] }
  };
};

/**
 * Déplace les fichiers d'un dossier source vers un dossier destination
 * Utile pour déplacer les fichiers de uploads/partners vers uploads/partners/:id après création
 */
export const moveFilesToPartnerFolder = async (
  files: Express.Multer.File[],
  partnerId: string
): Promise<string[]> => {
  const fs = await import('fs/promises');
  const pathModule = await import('path');
  
  const sourceDir = pathModule.join(process.cwd(), 'uploads', 'partners');
  const destDir = pathModule.join(process.cwd(), 'uploads', 'partners', partnerId);
  
  // Créer le dossier de destination s'il n'existe pas
  await fs.mkdir(destDir, { recursive: true });
  
  const movedFiles: string[] = [];
  
  for (const file of files) {
    // Le fichier peut être dans uploads/partners/ (POST) ou uploads/partners/:id/ (PATCH)
    // Vérifier d'abord si le fichier est déjà dans le bon dossier
    const currentPath = file.path;
    const expectedDestPath = pathModule.join(destDir, file.filename);
    
    console.log(`[moveFilesToPartnerFolder] Traitement du fichier: ${file.filename}`);
    console.log(`[moveFilesToPartnerFolder]   - currentPath: ${currentPath}`);
    console.log(`[moveFilesToPartnerFolder]   - expectedDestPath: ${expectedDestPath}`);
    console.log(`[moveFilesToPartnerFolder]   - sourceDir: ${sourceDir}`);
    console.log(`[moveFilesToPartnerFolder]   - destDir: ${destDir}`);
    
    // Si le fichier est déjà au bon endroit, ne rien faire
    if (currentPath === expectedDestPath) {
      console.log(`[moveFilesToPartnerFolder] ✅ Fichier ${file.filename} déjà au bon endroit`);
      movedFiles.push(file.filename);
      continue;
    }
    
    // Essayer d'abord avec le chemin standard (uploads/partners/filename)
    let sourcePath = pathModule.join(sourceDir, file.filename);
    
    // Vérifier si le fichier existe au chemin réel (file.path)
    let fileExistsAtCurrentPath = false;
    try {
      await fs.access(currentPath);
      fileExistsAtCurrentPath = true;
      console.log(`[moveFilesToPartnerFolder] ✅ Fichier existe à currentPath: ${currentPath}`);
    } catch {
      console.log(`[moveFilesToPartnerFolder] ❌ Fichier N'EXISTE PAS à currentPath: ${currentPath}`);
    }
    
    // Vérifier si le fichier existe dans le dossier temporaire
    let fileExistsInTempDir = false;
    try {
      await fs.access(sourcePath);
      fileExistsInTempDir = true;
      console.log(`[moveFilesToPartnerFolder] ✅ Fichier existe dans dossier temporaire: ${sourcePath}`);
    } catch {
      console.log(`[moveFilesToPartnerFolder] ❌ Fichier N'EXISTE PAS dans dossier temporaire: ${sourcePath}`);
    }
    
    // Choisir le chemin source approprié
    if (fileExistsAtCurrentPath) {
      sourcePath = currentPath;
    } else if (!fileExistsInTempDir) {
      // Le fichier n'existe nulle part, c'est une erreur
      const error = new Error(`Le fichier ${file.filename} n'existe ni à ${currentPath} ni à ${pathModule.join(sourceDir, file.filename)}`);
      console.error(`[moveFilesToPartnerFolder] ❌ ${error.message}`);
      throw error;
    }
    
    const destPath = pathModule.join(destDir, file.filename);
    
    try {
      // Vérifier que le fichier source existe
      await fs.access(sourcePath);
      
      // Si le fichier de destination existe déjà, le supprimer d'abord
      try {
        await fs.access(destPath);
        await fs.unlink(destPath);
        console.log(`[moveFilesToPartnerFolder] Fichier de destination existant supprimé: ${destPath}`);
      } catch {
        // Le fichier de destination n'existe pas, c'est normal
      }
      
      // Déplacer le fichier
      await fs.rename(sourcePath, destPath);
      movedFiles.push(file.filename);
      console.log(`[moveFilesToPartnerFolder] ✅ Fichier déplacé: ${sourcePath} -> ${destPath}`);
      
      // Vérifier que le fichier a bien été déplacé
      try {
        await fs.access(destPath);
        console.log(`[moveFilesToPartnerFolder] ✅ Fichier vérifié au nouvel emplacement: ${destPath}`);
      } catch {
        const error = new Error(`Le fichier n'a pas été déplacé correctement vers ${destPath}`);
        console.error(`[moveFilesToPartnerFolder] ❌ ${error.message}`);
        throw error;
      }
    } catch (error) {
      // Si le fichier n'existe pas ou erreur, logger l'erreur mais continuer
      console.error(`[moveFilesToPartnerFolder] ❌ Impossible de déplacer ${file.filename}:`, error);
      throw error; // Propager l'erreur pour que le handler puisse la gérer
    }
  }
  
  return movedFiles;
};

