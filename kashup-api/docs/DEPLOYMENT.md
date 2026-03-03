# Guide de déploiement - KashUP API

## Checklist de déploiement

### 1. Variables d'environnement

Créer un fichier `.env` avec les variables suivantes :

```env
# Base
NODE_ENV=production
PORT=4000
DATABASE_URL=file:./prod.db

# Sécurité
JWT_SECRET=<votre-secret-jwt-minimum-32-caracteres>
REFRESH_TOKEN_SECRET=<votre-secret-refresh-minimum-32-caracteres>

# CORS
CORS_ORIGIN=https://votre-back-office.com,https://votre-app-mobile.com

# Webhooks (optionnel mais recommandé)
MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/api/webhooks

# Powens (si utilisé)
POWENS_API_URL=https://kashup-sandbox.biapi.pro/2.0/
POWENS_CONFIG_KEY=<votre-cle>
POWENS_MONITORING_KEY=<votre-cle>
POWENS_USERS_KEY=<votre-cle>
POWENS_ENCRYPTION_PUBLIC_KEY=<votre-cle>

# Drimify (si utilisé)
DRIMIFY_API_URL=https://api.drimify.com/v1
DRIMIFY_API_KEY=<votre-cle>
```

### 2. Base de données

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy

# (Optionnel) Seed initial
npx prisma db seed
```

### 3. Build et démarrage

```bash
# Compiler TypeScript
npm run build

# Démarrer en production
npm start
```

### 4. Stockage des fichiers

**En développement** : Les fichiers sont stockés localement dans `uploads/`

**En production** : Recommandé d'utiliser un service cloud :
- AWS S3
- Google Cloud Storage
- Cloudinary
- Azure Blob Storage

Pour migrer vers S3, modifier `src/config/upload.ts` pour utiliser `multer-s3`.

### 5. Monitoring

- Vérifier les logs pour les erreurs de webhooks
- Surveiller l'espace disque pour les uploads
- Monitorer les performances de la base de données

### 6. Sécurité

- ✅ Utiliser HTTPS en production
- ✅ Valider tous les inputs avec Zod
- ✅ Limiter la taille des uploads (5MB max)
- ✅ Filtrer les types de fichiers (images uniquement)
- ✅ Authentification JWT requise pour les endpoints admin
- ✅ Vérifier les rôles utilisateurs

### 7. Webhooks

Pour activer la synchronisation avec l'app mobile :

1. Configurer `MOBILE_WEBHOOK_URL` dans `.env`
2. Vérifier que l'endpoint mobile accepte les webhooks
3. Tester avec un partenaire de test
4. Surveiller les logs pour les erreurs

### 8. Backup

- Sauvegarder régulièrement la base de données SQLite
- Sauvegarder le dossier `uploads/` si utilisé en production
- Configurer des backups automatiques

---

## Migration vers PostgreSQL/MySQL

Pour migrer de SQLite vers PostgreSQL ou MySQL :

1. Modifier `prisma/schema.prisma` :
```prisma
datasource db {
  provider = "postgresql" // ou "mysql"
  url      = env("DATABASE_URL")
}
```

2. Mettre à jour `DATABASE_URL` dans `.env`

3. Créer une nouvelle migration :
```bash
npx prisma migrate dev --name migrate_to_postgresql
```

---

## Optimisations production

1. **Cache** : Implémenter Redis pour le cache des partenaires/offres
2. **CDN** : Servir les images via CDN (CloudFront, Cloudflare)
3. **Rate limiting** : Ajouter rate limiting sur les endpoints publics
4. **Compression** : Activer gzip pour les réponses JSON
5. **Logging** : Configurer un service de logging centralisé (Datadog, Sentry)

