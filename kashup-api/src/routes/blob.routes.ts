/**
 * GET /api/v1/blob?url=... — proxy pour servir les fichiers depuis Vercel Blob (store privé).
 */

import { Router } from 'express';
import { getBlobProxy } from '../controllers/blob.controller';

const router = Router();
router.get('/blob', getBlobProxy);
export default router;
