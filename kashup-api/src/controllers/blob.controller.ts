/**
 * Proxy pour servir les images/fichiers depuis Vercel Blob (store privé).
 * GET /api/v1/blob?url=... — stream le contenu du blob vers le client.
 * Supporte les requêtes Range (bytes) pour la lecture vidéo (expo-av / AVPlayer).
 */

import { Request, Response } from 'express';
import { Readable, Transform } from 'stream';
import { get, head } from '@vercel/blob';

const BLOB_HOST = 'blob.vercel-storage.com';

/** Parse le header Range (ex. "bytes=0-1023" ou "bytes=1000-") */
function parseRange(rangeHeader: string, totalSize: number): { start: number; end: number } | null {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const [, startStr, endStr] = match;
  const start = startStr === '' ? 0 : Math.min(parseInt(startStr, 10), totalSize - 1);
  const end = endStr === '' ? totalSize - 1 : Math.min(parseInt(endStr, 10), totalSize - 1);
  if (start > end || start < 0) return null;
  return { start, end };
}

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
    const rangeHeader = req.get('range');
    const wantsRange = typeof rangeHeader === 'string' && rangeHeader.trim().length > 0;

    if (wantsRange) {
      // HEAD pour obtenir la taille (requise pour Content-Range)
      const headResult = await head(url);
      const totalSize = typeof headResult.size === 'number' ? headResult.size : 0;
      const range = totalSize > 0 ? parseRange(rangeHeader!, totalSize) : null;

      if (range) {
        const { start, end } = range;
        const length = end - start + 1;
        const result = await get(url, { access: 'private' as const });
        if (!result || result.statusCode !== 200) {
          res.status(404).send('Blob introuvable');
          return;
        }
        res.status(206);
        res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.setHeader('Content-Length', length);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const nodeStream = Readable.fromWeb(result.stream as Parameters<typeof Readable.fromWeb>[0]);
        let bytesSkipped = 0;
        let bytesSent = 0;
        const rangeTransform = new Transform({
          transform(chunk: Buffer | unknown, _encoding, callback) {
            const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer);
            let offset = 0;
            if (bytesSkipped < start) {
              const toSkip = Math.min(start - bytesSkipped, buf.length);
              bytesSkipped += toSkip;
              offset = toSkip;
            }
            if (offset < buf.length && bytesSent < length) {
              const toSend = buf.subarray(offset, offset + Math.min(length - bytesSent, buf.length - offset));
              bytesSent += toSend.length;
              this.push(toSend);
            }
            if (bytesSent >= length) {
              nodeStream.destroy();
              this.push(null);
            }
            callback();
          },
          flush(callback) {
            callback();
          },
        });
        nodeStream.pipe(rangeTransform).pipe(res);
        return;
      }
    }

    // Pas de Range ou parsing échoué : envoi complet
    const result = await get(url, { access: 'private' as const });
    if (!result || result.statusCode !== 200) {
      res.status(404).send('Blob introuvable');
      return;
    }
    res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Accept-Ranges', 'bytes');
    const nodeStream = Readable.fromWeb(result.stream as Parameters<typeof Readable.fromWeb>[0]);
    nodeStream.pipe(res);
  } catch (err) {
    console.error('[blob] Erreur proxy:', err);
    res.status(500).json({ error: 'Erreur lors du chargement du fichier' });
  }
}
