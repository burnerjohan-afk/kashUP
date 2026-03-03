import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth';
import {
  getWebviewUrl,
  powensCallback,
  finalizeConnection,
  syncConnection,
  listConnections
} from '../controllers/powensIntegration.controller';

const router = Router();

// Route publique pour le callback Powens (sans auth car appelée par Powens)
router.get('/callback', powensCallback);

// Routes protégées
router.use(authMiddleware);

// Générer l'URL Webview
router.get('/webview-url', getWebviewUrl);

// Finaliser la connexion (alternative si callback front)
router.post('/finalize', finalizeConnection);

// Lister les connexions
router.get('/connections', listConnections);

// Synchroniser une connexion
router.post('/connections/:connectionId/sync', syncConnection);

export default router;

