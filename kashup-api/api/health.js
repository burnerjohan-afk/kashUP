/**
 * Health check minimal — répond immédiatement sans charger Express/Prisma.
 * Évite le cold start sur les checks de santé (Vercel, load balancers, app mobile).
 */
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(
    JSON.stringify({
      status: 'ok',
      env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    })
  );
};
