/**
 * Point d'entrée serverless Vercel pour l'app Express.
 * Toutes les requêtes sont réécrites vers cette fonction (voir vercel.json).
 */
const server = require('../dist/server.js');
const app = server.default || server;
module.exports = app;
