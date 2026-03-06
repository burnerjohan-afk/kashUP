/**
 * Crée un utilisateur de test via l'API signup.
 * Usage: API démarrée sur le port par défaut (4000) puis:
 *   npx tsx scripts/create-test-user.ts
 *
 * Identifiants créés:
 *   Email: test@kashup.com
 *   Mot de passe: Test123!
 */
/// <reference types="node" />

const API_BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

function isConnectionRefused(err: unknown): boolean {
  const cause = err && typeof err === 'object' && 'cause' in err ? (err as { cause?: unknown }).cause : null;
  if (cause && typeof cause === 'object' && 'code' in cause) return (cause as { code: string }).code === 'ECONNREFUSED';
  return false;
}

async function main() {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@kashup.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'Utilisateur',
        territory: 'Martinique',
      }),
    });
  } catch (err) {
    if (isConnectionRefused(err)) {
      console.error('❌ Connexion refusée : l\'API KashUP n\'est pas démarrée.');
      console.error('');
      console.error('   Démarrez l\'API dans un autre terminal :');
      console.error('   cd kashup-api');
      console.error('   npm run dev');
      console.error('');
      console.error('   Puis relancez ce script.');
      process.exit(1);
    }
    throw err;
  }

  const data = await res.json().catch(() => ({}));

  if (res.ok && data.success) {
    console.log('✅ Utilisateur de test créé.');
    console.log('   Email: test@kashup.com');
    console.log('   Mot de passe: Test123!');
    console.log('   Connectez-vous sur /connexion avec ces identifiants.');
    return;
  }

  if (res.status === 409 || (data.message && data.message.includes('existe déjà'))) {
    console.log('ℹ️  L\'utilisateur test@kashup.com existe déjà.');
    console.log('   Email: test@kashup.com');
    console.log('   Mot de passe: Test123!');
    console.log('   Connectez-vous sur /connexion avec ces identifiants.');
    return;
  }

  console.error('❌ Erreur:', data.message || res.statusText || res.status);
  if (!res.ok) process.exit(1);
}

main();
