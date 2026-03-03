# Audit de Conformité Réglementaire - Kashup API

**Date :** 2024-12-13  
**Auditeur :** Expert conformité RGPD/DSP2/KYC/AML  
**Version :** 1.0

---

## 1. IDENTIFICATION DES DONNÉES PERSONNELLES ET SENSIBLES

### 1.1 Données personnelles identifiées (RGPD Art. 4)

#### Données directement identifiables
- **User** : `email`, `firstName`, `lastName`, `phone`, `territory`
- **GiftCardPurchase** : `beneficiaryEmail` (données tierces)
- **ReferralInvite** : `inviteeEmail` (données tierces)
- **Partner** : `siret`, `phone` (données professionnelles)

#### Données financières (sensibles - RGPD Art. 9)
- **Wallet** : `soldeCashback`, `soldePoints`, `soldeCoffreFort`
- **Transaction** : `amount`, `cashbackEarned`, `pointsEarned`, `transactionDate`, `source`, `status`
- **BankAccount** : `iban`, `balance`, `currency` ⚠️ **TRÈS SENSIBLE**
- **BankTransaction** : `amount`, `label`, `category`, `date` ⚠️ **TRÈS SENSIBLE**
- **PowensConnection** : `accessToken` ⚠️ **CRITIQUE** (accès bancaire)
- **UserPaymentMethod** : `last4` (données de carte)

#### Données de connexion bancaire (DSP2)
- **PowensConnection** : `powensUserId`, `powensConnectionId`, `accessToken`
- **BankAccount** : `iban`, `balance`, `raw` (JSON complet)
- **BankTransaction** : `raw` (JSON complet)

#### Données comportementales
- **Transaction** : historique complet des achats
- **Points** : historique des points
- **Notification** : préférences et historique
- **FavoritePartner** : préférences utilisateur
- **UserBoost**, **UserBadge** : comportement gamification

### 1.2 Classification par niveau de sensibilité

| Niveau | Données | Base légale RGPD | Durée conservation recommandée |
|--------|---------|------------------|--------------------------------|
| **Critique** | IBAN, transactions bancaires, accessToken Powens | Consentement explicite (DSP2) | 5 ans (obligations comptables) |
| **Très sensible** | Email, téléphone, transactions cashback | Consentement / Exécution contrat | 3 ans après dernière activité |
| **Sensible** | Nom, prénom, territoire, wallet | Exécution contrat | 3 ans après dernière activité |
| **Standard** | Préférences, badges, notifications | Consentement | 2 ans après dernière activité |

---

## 2. ANALYSE DE CONFORMITÉ

### 2.1 RGPD (Règlement UE 2016/679)

#### ✅ CONFORMITÉS ACTUELLES

1. **Chiffrement des mots de passe** ✅
   - Utilisation de `bcrypt` avec 10 rounds (conforme)
   - Fichier : `src/utils/password.ts`

2. **Authentification JWT** ✅
   - Tokens signés avec secret
   - Middleware d'authentification présent

3. **Logging structuré** ✅
   - Utilisation de Pino
   - Request ID pour traçabilité

#### ❌ NON-CONFORMITÉS CRITIQUES

##### NC-1 : Absence de consentement RGPD
**Gravité :** 🔴 CRITIQUE  
**Article RGPD :** Art. 6 (1) c, Art. 7  
**Description :** Aucun modèle de consentement stocké dans la base de données.

**Correctif obligatoire :**
```prisma
// Ajouter au schema.prisma
model UserConsent {
  id              String   @id @default(cuid())
  userId          String   @unique
  privacyPolicy   Boolean  @default(false)
  privacyPolicyAt DateTime?
  marketing       Boolean  @default(false)
  marketingAt     DateTime?
  analytics       Boolean  @default(false)
  analyticsAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

##### NC-2 : Access Token Powens non chiffré
**Gravité :** 🔴 CRITIQUE  
**Article RGPD :** Art. 32 (sécurité)  
**Description :** `PowensConnection.accessToken` stocké en clair dans la DB.

**Correctif obligatoire :**
```typescript
// src/utils/encryption.ts (NOUVEAU FICHIER)
import crypto from 'crypto';
import env from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Générer une clé depuis une variable d'environnement
const getEncryptionKey = (): Buffer => {
  const key = env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  return crypto.scryptSync(key, 'kashup-salt', 32);
};

export const encrypt = (text: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  // Format: iv:tag:encrypted
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  
  const [ivHex, tagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

**Modifier `src/controllers/powensIntegration.controller.ts` :**
```typescript
import { encrypt, decrypt } from '../utils/encryption';

// Lors de la création/mise à jour
accessToken: encrypt(tokenResponse.access_token)

// Lors de l'utilisation
const accessToken = decrypt(connection.accessToken);
```

##### NC-3 : Absence de politique de conservation
**Gravité :** 🟡 MOYENNE  
**Article RGPD :** Art. 5 (1) e (principe de limitation de conservation)  
**Description :** Aucune durée de conservation définie, aucune suppression automatique.

**Correctif obligatoire :**
```typescript
// src/services/dataRetention.service.ts (NOUVEAU FICHIER)
import prisma from '../config/prisma';
import logger from '../utils/logger';

// Durées de conservation (en jours)
const RETENTION_PERIODS = {
  // Données utilisateur inactif (3 ans après dernière connexion)
  INACTIVE_USER: 3 * 365,
  // Logs d'audit (1 an)
  AUDIT_LOGS: 365,
  // Notifications lues (6 mois)
  READ_NOTIFICATIONS: 180,
  // Tokens Powens expirés (30 jours après expiration)
  EXPIRED_TOKENS: 30,
  // Transactions bancaires (5 ans - obligation comptable)
  BANK_TRANSACTIONS: 5 * 365,
} as const;

export const deleteInactiveUsers = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.INACTIVE_USER);
  
  const inactiveUsers = await prisma.user.findMany({
    where: {
      updatedAt: { lt: cutoffDate },
      // Ne pas supprimer si wallet actif
      wallet: {
        OR: [
          { soldeCashback: { gt: 0 } },
          { soldePoints: { gt: 0 } }
        ]
      }
    }
  });
  
  for (const user of inactiveUsers) {
    // Anonymiser au lieu de supprimer (RGPD Art. 17)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: `deleted_${user.id}@deleted.local`,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        hashedPassword: 'DELETED'
      }
    });
    
    logger.info({ userId: user.id }, 'Utilisateur inactif anonymisé');
  }
};

export const cleanupExpiredTokens = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_PERIODS.EXPIRED_TOKENS);
  
  await prisma.powensLinkToken.deleteMany({
    where: {
      expiresAt: { lt: cutoffDate }
    }
  });
};
```

##### NC-4 : Absence de droit à l'effacement (droit à l'oubli)
**Gravité :** 🔴 CRITIQUE  
**Article RGPD :** Art. 17  
**Description :** Aucun endpoint pour supprimer/anonymiser les données utilisateur.

**Correctif obligatoire :**
```typescript
// src/controllers/user.controller.ts (AJOUTER)
export const deleteMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  
  // Vérifier qu'il n'y a pas de solde actif
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (wallet && (wallet.soldeCashback > 0 || wallet.soldePoints > 0)) {
    throw new AppError(
      'Impossible de supprimer le compte : solde actif. Veuillez d\'abord utiliser vos crédits.',
      400
    );
  }
  
  // Anonymiser les données (soft delete)
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted_${userId}@deleted.local`,
      firstName: 'Deleted',
      lastName: 'User',
      phone: null,
      hashedPassword: 'DELETED',
      // Supprimer les connexions bancaires
      powensConnections: {
        deleteMany: {}
      }
    }
  });
  
  sendSuccess(res, { message: 'Compte supprimé avec succès' });
});
```

##### NC-5 : Absence de portabilité des données
**Gravité :** 🟡 MOYENNE  
**Article RGPD :** Art. 20  
**Description :** Aucun endpoint pour exporter les données utilisateur.

**Correctif recommandé :**
```typescript
// src/controllers/user.controller.ts (AJOUTER)
export const exportMyData = asyncHandler(async (req: Request, res: Response) => {
  const userId = ensureAuth(req);
  
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallet: true,
      transactions: true,
      bankAccounts: {
        include: {
          bankTransactions: true
        }
      },
      notifications: true,
      pointsHistory: true
    }
  });
  
  // Format JSON structuré (format machine-readable)
  const exportData = {
    profile: {
      email: userData?.email,
      firstName: userData?.firstName,
      lastName: userData?.lastName,
      territory: userData?.territory,
      createdAt: userData?.createdAt
    },
    wallet: userData?.wallet,
    transactions: userData?.transactions,
    bankAccounts: userData?.bankAccounts,
    notifications: userData?.notifications,
    pointsHistory: userData?.pointsHistory
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="kashup-data-${userId}.json"`);
  res.json(exportData);
});
```

##### NC-6 : Logs contiennent des données personnelles
**Gravité :** 🟡 MOYENNE  
**Article RGPD :** Art. 32  
**Description :** Les logs peuvent contenir des emails, IDs utilisateur, etc.

**Correctif recommandé :**
```typescript
// src/middlewares/requestLogger.ts (MODIFIER)
// Ne pas logger les données sensibles
logger.info({
  requestId,
  method: req.method,
  path: req.path,
  // Ne PAS logger req.body complet si contient des données sensibles
  user: req.user ? { id: hashUserId(req.user.sub), role: req.user.role } : null
}, '📨 Requête entrante');

// Fonction de hachage pour les IDs
const hashUserId = (userId: string): string => {
  return crypto.createHash('sha256').update(userId + process.env.LOG_SALT).digest('hex').substring(0, 8);
};
```

### 2.2 DSP2 (Directive PSD2 / Règlement UE 2018/389)

#### ✅ CONFORMITÉS ACTUELLES

1. **Intégration Powens** ✅
   - Utilisation d'un TPP (Third Party Provider) agréé
   - Flow d'authentification conforme

#### ❌ NON-CONFORMITÉS

##### NC-7 : Stockage IBAN en clair
**Gravité :** 🔴 CRITIQUE  
**Réglementation :** DSP2 Art. 94, Règlement UE 2018/389  
**Description :** Les IBAN sont stockés en clair dans `BankAccount.iban`.

**Correctif obligatoire :**
```typescript
// Utiliser le même système de chiffrement que pour accessToken
// src/services/powens/powensSync.service.ts (MODIFIER)
iban: powensAccount.iban ? encrypt(powensAccount.iban) : null
```

##### NC-8 : Absence de journal d'audit pour accès bancaires
**Gravité :** 🔴 CRITIQUE  
**Réglementation :** DSP2 Art. 94 (traçabilité)  
**Description :** Aucun log des accès aux données bancaires.

**Correctif obligatoire :**
```prisma
// Ajouter au schema.prisma
model BankAccessLog {
  id            String   @id @default(cuid())
  userId        String
  connectionId String
  action        String   // 'sync', 'view_accounts', 'view_transactions'
  ipAddress     String?
  userAgent     String?
  success       Boolean
  errorMessage  String?
  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([createdAt])
}
```

```typescript
// src/middlewares/bankAccessLogger.ts (NOUVEAU FICHIER)
export const logBankAccess = (userId: string, connectionId: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', async () => {
      await prisma.bankAccessLog.create({
        data: {
          userId,
          connectionId,
          action,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
          success: res.statusCode < 400,
          errorMessage: res.statusCode >= 400 ? 'Error' : null
        }
      });
    });
    
    next();
  };
};
```

##### NC-9 : Absence de consentement explicite DSP2
**Gravité :** 🔴 CRITIQUE  
**Réglementation :** DSP2 Art. 67 (consentement explicite)  
**Description :** Aucun consentement spécifique stocké pour l'accès aux comptes bancaires.

**Correctif obligatoire :**
```prisma
// Ajouter au schema.prisma
model BankConsent {
  id              String   @id @default(cuid())
  userId          String
  connectionId    String
  consentGiven    Boolean  @default(false)
  consentGivenAt  DateTime?
  consentRevoked  Boolean  @default(false)
  consentRevokedAt DateTime?
  scope           String   // 'accounts', 'transactions', 'balances'
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id])
  
  @@unique([userId, connectionId])
}
```

### 2.3 KYC / AML (Lutte contre le blanchiment)

#### ❌ NON-CONFORMITÉS

##### NC-10 : Absence de vérification d'identité
**Gravité :** 🟡 MOYENNE (selon seuils)  
**Réglementation :** Directive UE 2015/849 (4ème directive AML)  
**Description :** Aucun processus KYC pour les utilisateurs.

**Correctif recommandé (si seuils dépassés) :**
```prisma
// Ajouter au schema.prisma
model KYCVerification {
  id              String   @id @default(cuid())
  userId          String   @unique
  status          String   @default("pending") // pending, verified, rejected
  level           String   @default("basic")   // basic, enhanced
  provider        String?  // Nom du provider KYC (ex: Onfido, Sumsub)
  providerId      String?
  documents       String?  // JSON array des documents
  verifiedAt      DateTime?
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id])
}
```

##### NC-11 : Absence de monitoring des transactions suspectes
**Gravité :** 🟡 MOYENNE  
**Réglementation :** Directive UE 2015/849 Art. 33  
**Description :** Aucun système de détection de transactions suspectes.

**Correctif recommandé :**
```typescript
// src/services/amlMonitoring.service.ts (NOUVEAU FICHIER)
export const checkSuspiciousTransaction = async (transaction: {
  userId: string;
  amount: number;
  partnerId: string;
}) => {
  // Seuils à définir selon réglementation
  const SUSPICIOUS_THRESHOLDS = {
    SINGLE_TRANSACTION: 10000, // €
    DAILY_TOTAL: 15000,        // €
    MONTHLY_TOTAL: 50000       // €
  };
  
  // Vérifier seuil transaction unique
  if (transaction.amount >= SUSPICIOUS_THRESHOLDS.SINGLE_TRANSACTION) {
    await flagSuspiciousActivity(transaction.userId, 'HIGH_AMOUNT', transaction);
  }
  
  // Vérifier total journalier
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTotal = await prisma.transaction.aggregate({
    where: {
      userId: transaction.userId,
      transactionDate: { gte: todayStart },
      status: 'confirmed'
    },
    _sum: { amount: true }
  });
  
  if ((todayTotal._sum.amount || 0) >= SUSPICIOUS_THRESHOLDS.DAILY_TOTAL) {
    await flagSuspiciousActivity(transaction.userId, 'DAILY_THRESHOLD', transaction);
  }
};

const flagSuspiciousActivity = async (userId: string, reason: string, data: any) => {
  await prisma.userSecurityEvent.create({
    data: {
      userId,
      title: 'Transaction suspecte détectée',
      description: `Raison: ${reason}. Montant: ${data.amount}€`
    }
  });
  
  // TODO: Notifier le service de conformité
};
```

### 2.4 Sécurité des SI (ANSSI / EU)

#### ❌ NON-CONFORMITÉS

##### NC-12 : Base de données SQLite en production
**Gravité :** 🔴 CRITIQUE  
**Recommandation ANSSI :** Utiliser une base de données sécurisée avec chiffrement au repos.

**Correctif obligatoire :**
- Migrer vers PostgreSQL avec chiffrement TDE (Transparent Data Encryption)
- Ou utiliser SQLite avec chiffrement (SQLCipher)

##### NC-13 : Absence de rate limiting
**Gravité :** 🟡 MOYENNE  
**Recommandation ANSSI :** Protection contre les attaques par force brute.

**Correctif recommandé :**
```typescript
// src/middlewares/rateLimiter.ts (NOUVEAU FICHIER)
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export const authRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false
});

export const apiRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requêtes max par minute
  standardHeaders: true
});
```

##### NC-14 : Absence de HTTPS enforcement
**Gravité :** 🔴 CRITIQUE  
**Recommandation ANSSI :** Forcer HTTPS en production.

**Correctif obligatoire :**
```typescript
// src/app.ts (MODIFIER)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

##### NC-15 : Secrets en variables d'environnement non sécurisées
**Gravité :** 🟡 MOYENNE  
**Recommandation :** Utiliser un gestionnaire de secrets (AWS Secrets Manager, HashiCorp Vault).

**Correctif recommandé :**
- Utiliser un service de secrets managés en production
- Rotation automatique des clés

---

## 3. CORRECTIFS TECHNIQUES PRIORISÉS

### 🔴 OBLIGATOIRE AVANT PRODUCTION

1. **Chiffrer accessToken Powens** (NC-2)
2. **Chiffrer IBAN** (NC-7)
3. **Ajouter consentement RGPD** (NC-1)
4. **Implémenter droit à l'effacement** (NC-4)
5. **Journal d'audit accès bancaires** (NC-8)
6. **Consentement explicite DSP2** (NC-9)
7. **Forcer HTTPS** (NC-14)
8. **Migrer DB production** (NC-12)

### 🟡 RECOMMANDÉ (MVP conforme)

9. **Politique de conservation** (NC-3)
10. **Portabilité des données** (NC-5)
11. **Rate limiting** (NC-13)
12. **Anonymisation logs** (NC-6)

### ⚪ OPTIONNEL (selon croissance)

13. **KYC/AML** (NC-10, NC-11) - Si seuils réglementaires dépassés
14. **Gestionnaire de secrets** (NC-15) - Pour scale

---

## 4. CHECKLIST DE CONFORMITÉ FINALE

### RGPD

- [ ] Modèle `UserConsent` créé et migrations appliquées
- [ ] Endpoint `POST /me/consent` pour gérer les consentements
- [ ] Endpoint `DELETE /me/account` pour droit à l'effacement
- [ ] Endpoint `GET /me/export` pour portabilité des données
- [ ] Service `dataRetention.service.ts` créé et planifié (cron)
- [ ] Logs anonymisés (pas de données personnelles en clair)
- [ ] Politique de confidentialité accessible et versionnée
- [ ] Mentions légales avec coordonnées DPO

### DSP2

- [ ] `accessToken` Powens chiffré avec AES-256-GCM
- [ ] `iban` chiffré dans `BankAccount`
- [ ] Modèle `BankConsent` créé
- [ ] Modèle `BankAccessLog` créé
- [ ] Middleware `logBankAccess` appliqué sur routes bancaires
- [ ] Consentement explicite demandé avant connexion Powens
- [ ] Possibilité de révoquer le consentement bancaire

### KYC/AML (si applicable)

- [ ] Modèle `KYCVerification` créé
- [ ] Service `amlMonitoring.service.ts` créé
- [ ] Seuils de transactions suspectes définis
- [ ] Processus de signalement aux autorités (si requis)

### Sécurité SI

- [ ] HTTPS forcé en production
- [ ] Rate limiting sur `/auth/login` et `/auth/signup`
- [ ] Base de données production avec chiffrement au repos
- [ ] Variables d'environnement sécurisées (secrets manager)
- [ ] Headers de sécurité (Helmet configuré) ✅ (déjà présent)
- [ ] CORS restreint en production ✅ (déjà présent)

### Documentation

- [ ] Politique de confidentialité rédigée
- [ ] Mentions légales avec DPO
- [ ] Documentation technique des mesures de sécurité
- [ ] Procédure de gestion des violations (RGPD Art. 33-34)

---

## 5. FICHIERS À CRÉER/MODIFIER

### Nouveaux fichiers

1. `src/utils/encryption.ts` - Chiffrement AES-256-GCM
2. `src/services/dataRetention.service.ts` - Gestion conservation données
3. `src/services/amlMonitoring.service.ts` - Monitoring AML
4. `src/middlewares/bankAccessLogger.ts` - Log accès bancaires
5. `src/middlewares/rateLimiter.ts` - Rate limiting
6. `prisma/migrations/XXX_add_rgpd_consent/migration.sql` - Migration consentements
7. `prisma/migrations/XXX_add_bank_audit/migration.sql` - Migration audit bancaire

### Fichiers à modifier

1. `prisma/schema.prisma` - Ajouter modèles RGPD/DSP2
2. `src/controllers/powensIntegration.controller.ts` - Chiffrer accessToken
3. `src/services/powens/powensSync.service.ts` - Chiffrer IBAN
4. `src/controllers/user.controller.ts` - Ajouter delete/export
5. `src/middlewares/requestLogger.ts` - Anonymiser logs
6. `src/app.ts` - HTTPS enforcement, rate limiting
7. `env.example` - Ajouter `ENCRYPTION_KEY`

---

## 6. RÉFÉRENCES RÉGLEMENTAIRES

- **RGPD :** Règlement UE 2016/679
- **DSP2 :** Directive 2015/2366 (PSD2) + Règlement UE 2018/389
- **AML :** Directive UE 2015/849 (4ème directive)
- **ANSSI :** Guide d'hygiène informatique (référentiel général de sécurité)

---

**Prochaines étapes :**
1. Prioriser les correctifs 🔴 obligatoires
2. Implémenter les correctifs dans l'ordre de priorité
3. Tester chaque correctif
4. Documenter les procédures
5. Former l'équipe sur les bonnes pratiques

