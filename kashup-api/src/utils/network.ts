import os from 'os';
import { Request } from 'express';
import logger from './logger';

/**
 * Détecte l'IPv4 LAN active (première interface non-loopback avec IPv4)
 * @returns L'adresse IPv4 LAN ou null si aucune n'est trouvée
 */
export function getLocalIPv4(): string | null {
  try {
    const interfaces = os.networkInterfaces();
    
    // Parcourir toutes les interfaces réseau
    for (const name of Object.keys(interfaces)) {
      const addresses = interfaces[name];
      if (!addresses) continue;
      
      // Ignorer les interfaces loopback et les interfaces non-actives
      if (name.startsWith('lo') || name.includes('Loopback')) {
        continue;
      }
      
      // Chercher la première adresse IPv4 non-internal
      for (const addr of addresses) {
        if (addr.family === 'IPv4' && !addr.internal) {
          logger.debug({ interface: name, ip: addr.address }, 'IPv4 LAN détectée');
          return addr.address;
        }
      }
    }
    
    logger.warn('Aucune IPv4 LAN détectée');
    return null;
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Erreur lors de la détection IPv4 LAN');
    return null;
  }
}

/**
 * Construit une URL complète à partir d'un chemin relatif
 * @param req - Request Express
 * @param path - Chemin relatif (ex: /uploads/...)
 * @returns URL complète avec IP LAN ou localhost
 */
export function buildAbsoluteUrl(req: Request, path: string): string {
  if (!path || typeof path !== 'string') return '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const protocol = req.protocol || 'http';
  const host = req.get('host');
  const hostname = req.hostname || host?.split(':')[0] || 'localhost';
  const port = host?.includes(':') ? host.split(':')[1] : (process.env.PORT || '4000');

  // Si c'est localhost/127.0.0.1, utiliser l'IP LAN pour que le téléphone puisse charger les images
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const lanIp = getLocalIPv4();
    if (lanIp) {
      return `${protocol}://${lanIp}:${port}${normalizedPath}`;
    }
  }

  return `${protocol}://${hostname}:${port}${normalizedPath}`;
}

/**
 * Construit une URL complète avec l'IP LAN détectée
 * @param path - Chemin relatif (ex: /uploads/...)
 * @param port - Port (défaut: 4000)
 * @returns URL complète avec IP LAN ou localhost
 */
export function buildLanUrl(path: string, port: number = 4000): string {
  const lanIp = getLocalIPv4();
  if (lanIp) {
    return `http://${lanIp}:${port}${path}`;
  }
  return `http://localhost:${port}${path}`;
}

