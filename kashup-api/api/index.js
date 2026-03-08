/**
 * Point d'entrée serverless Vercel pour l'app Express.
 * Toutes les requêtes sont réécrites vers cette fonction (voir vercel.json).
 * Neon crée POSTGRES_PRISMA_URL (avec connect_timeout) ; on l'utilise en priorité.
 */
if (process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL;
}

let app;
try {
  const server = require('../dist/server.js');
  app = server.default || server;
} catch (err) {
  const message = err && (err.message || String(err));
  app = (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).end(JSON.stringify({
      error: 'Échec du démarrage',
      message,
      hint: 'Vérifiez les logs Vercel (Fonctions) pour la stack complète.',
    }));
  };
}
module.exports = app;
