import env from './config/env';
import createApp from './app';
import logger from './utils/logger';
import { registerJobs } from './jobs/scheduler';
import { getLocalIPv4 } from './utils/network';

const app = createApp();

// Capturer les erreurs non gérées au niveau du processus
process.on('uncaughtException', (error) => {
  logger.error({ 
    error: error.message, 
    stack: error.stack,
    name: error.name
  }, '❌ Exception non capturée');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ 
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString()
  }, '❌ Rejection non gérée');
});

const HOST = '0.0.0.0'; // Écouter sur toutes les interfaces réseau (accessible depuis le réseau local)
const PORT = env.PORT || 4000;
const BASE_PATH = '/api/v1';

// Sur Vercel (serverless), ne pas appeler listen() ni les crons — seul l'export de l'app est utilisé
const isVercel = typeof process.env.VERCEL === 'string';

if (!isVercel) {
  app.listen(PORT, HOST, () => {
    const ipv4 = getLocalIPv4();
    const lanUrl = ipv4 ? `http://${ipv4}:${PORT}` : null;
    
    logger.info({
      host: HOST,
      port: PORT,
      basePath: BASE_PATH,
      ipv4: ipv4 || 'non détectée',
      listenAddress: `http://${HOST}:${PORT}`,
      localAccess: `http://localhost:${PORT}`,
      networkAccess: lanUrl || 'IP LAN non détectée',
      origins: lanUrl ? [lanUrl, `http://localhost:${PORT}`] : [`http://localhost:${PORT}`]
    }, '🚀 KashUP API démarrée et accessible');
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 KashUP API démarrée avec succès');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📍 Host: ${HOST}`);
    console.log(`🔌 Port: ${PORT} (env.PORT: ${env.PORT || 'non défini, défaut 4000'})`);
    console.log(`🌐 API listening on http://${HOST}:${PORT}`);
    console.log(`📁 Base Path: ${BASE_PATH}`);
    if (ipv4) {
      console.log(`🌍 IPv4 LAN détectée: ${ipv4}`);
    } else {
      console.log(`⚠️  IPv4 LAN non détectée (vérifiez votre connexion réseau)`);
    }
    console.log('\n📋 Endpoints disponibles (URLs construites dynamiquement):');
    console.log(`   ✅ Health: http://localhost:${PORT}/health`);
    if (ipv4) {
      console.log(`   ✅ Health (LAN): http://${ipv4}:${PORT}/health`);
    }
    console.log(`   ✅ Health (v1): http://localhost:${PORT}${BASE_PATH}/health`);
    if (ipv4) {
      console.log(`   ✅ Health (v1, LAN): http://${ipv4}:${PORT}${BASE_PATH}/health`);
    }
    console.log(`   ✅ Partners: http://localhost:${PORT}${BASE_PATH}/partners`);
    if (ipv4) {
      console.log(`   ✅ Partners (LAN): http://${ipv4}:${PORT}${BASE_PATH}/partners`);
    }
    console.log(`   ✅ Debug Network: http://localhost:${PORT}${BASE_PATH}/debug/network`);
    if (ipv4) {
      console.log(`   ✅ Debug Network (LAN): http://${ipv4}:${PORT}${BASE_PATH}/debug/network`);
    }
    console.log(`   ✅ Uploads: http://localhost:${PORT}/uploads/...`);
    if (ipv4) {
      console.log(`   ✅ Uploads (LAN): http://${ipv4}:${PORT}/uploads/...`);
    }
    console.log('\n📱 Accessible depuis:');
    console.log(`   • Localhost: http://localhost:${PORT}`);
    if (ipv4) {
      console.log(`   • Réseau local: http://${ipv4}:${PORT}`);
    } else {
      console.log(`   • Réseau local: IP LAN non détectée`);
    }
    console.log('═══════════════════════════════════════════════════════════\n');
  }).on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error({
        port: PORT,
        error: error.message,
        suggestion: `Le port ${PORT} est déjà utilisé. Vérifiez qu'un autre processus n'écoute pas sur ce port, ou changez PORT dans votre fichier .env`
      }, '❌ Erreur: Port déjà utilisé (EADDRINUSE)');
      
      console.error('\n❌ ERREUR: Le port est déjà utilisé');
      console.error(`   Port: ${PORT}`);
      console.error(`   Message: ${error.message}`);
      console.error('\n💡 Solutions:');
      console.error(`   1. Arrêter le processus qui utilise le port ${PORT}`);
      console.error(`   2. Changer le port dans votre fichier .env: PORT=4001`);
      console.error(`   3. Vérifier les processus: netstat -ano | findstr :${PORT}`);
      console.error('');
      process.exit(1);
    } else {
      logger.error({
        error: error.message,
        stack: error.stack,
        code: error.code
      }, '❌ Erreur lors du démarrage du serveur');
      throw error;
    }
  });

  registerJobs();
}

export default app;


