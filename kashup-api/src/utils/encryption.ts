import crypto from 'crypto';
import env from '../config/env';

/**
 * Service de chiffrement pour données sensibles (RGPD Art. 32)
 * Utilise AES-256-GCM (chiffrement authentifié)
 * 
 * OBLIGATOIRE pour :
 * - PowensConnection.accessToken
 * - BankAccount.iban
 * - Toute donnée financière sensible
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Génère la clé de chiffrement depuis la variable d'environnement
 * La clé doit faire au moins 32 caractères
 */
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY || env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY must be defined and at least 32 characters long. ' +
      'Generate with: openssl rand -base64 32'
    );
  }
  // Utiliser scrypt pour dériver une clé de 32 bytes
  return crypto.scryptSync(key, 'kashup-salt-v1', 32);
};

/**
 * Chiffre un texte en utilisant AES-256-GCM
 * Format de sortie: iv:tag:encrypted (hex)
 * 
 * @param text - Texte à chiffrer
 * @returns Chaîne hexadécimale formatée iv:tag:encrypted
 */
export const encrypt = (text: string): string => {
  if (!text || text.trim() === '') {
    throw new Error('Cannot encrypt empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // Format: iv:tag:encrypted (tous en hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};

/**
 * Déchiffre un texte chiffré avec encrypt()
 * 
 * @param encryptedText - Texte chiffré au format iv:tag:encrypted
 * @returns Texte déchiffré
 * @throws Error si le format est invalide ou si l'authentification échoue
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText || encryptedText.trim() === '') {
    throw new Error('Cannot decrypt empty string');
  }

  const key = getEncryptionKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected iv:tag:encrypted');
  }

  const [ivHex, tagHex, encrypted] = parts;

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
      throw new Error('Invalid IV or tag length');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Vérifie si une chaîne est chiffrée (format iv:tag:encrypted)
 */
export const isEncrypted = (text: string): boolean => {
  if (!text || text.trim() === '') return false;
  const parts = text.split(':');
  return parts.length === 3 && 
         parts[0].length === IV_LENGTH * 2 && // IV en hex = 32 chars
         parts[1].length === TAG_LENGTH * 2;  // Tag en hex = 32 chars
};

