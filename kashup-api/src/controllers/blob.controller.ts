/**
 * Proxy pour servir les images/fichiers depuis Vercel Blob (store privé).
 * GET /api/v1/blob?url=... — stream le contenu du blob vers le client.
 */

import { Request, Response } from 'express';
import { Readable } from 'stream';
import { get } from '@vercel/blob';

const BLOB_HOST = 'blob.vercel-storage.com';

export async function getBlobProxy(req: Request, res: Response): Promise<void> {
  const rawUrl = req.query.url;
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    res.status(400).json({ error: 'Paramètre url requis' });
    return;
  }
  const url = rawUrl.trim();
  if (!url.includes(BLOB_HOST)) {
    res.status(400).json({ error: 'URL non autorisée (Blob Vercel uniquement)' });
    return;
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(503).json({ error: 'Blob non configuré' });
    return;
  }
  try {
    const result = await get(url, { access: 'private' });
    if (!result || result.statusCode !== 200) {
      res.status(404).send('Blob introuvable');
      return;
    }
    res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h
    // Readable.fromWeb attend un ReadableStream Web API (compatible Node 18+)
    const nodeStream = Readable.fromWeb(result.stream as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.pipe(res);
  } catch (err) {
    console.error('[blob] Erreur proxy:', err);
    res.status(500).json({ error: 'Erreur lors du chargement du fichier' });
  }
}
