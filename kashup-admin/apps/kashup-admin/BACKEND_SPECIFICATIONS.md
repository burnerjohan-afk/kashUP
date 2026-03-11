# Spécifications Backend pour Conformité Sécurité

Ce document décrit les endpoints et fonctionnalités backend à implémenter pour compléter la conformité RGPD/DSP2/KYC.

---

## 1. Endpoint d'Audit - `POST /admin/audit/log`

### Description
Endpoint pour recevoir et stocker les logs d'audit générés par le frontend.

### Route
```
POST /admin/audit/log
```

### Headers
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Body
```typescript
{
  type: 'user_view' | 'user_modify' | 'wallet_adjust' | 'kyc_force' | 
        'password_reset' | 'powens_access' | 'transaction_view' | 
        'transaction_modify' | 'partner_view' | 'partner_modify';
  userId?: string;
  partnerId?: string;
  transactionId?: string;
  adminId: string;
  adminEmail: string;
  action?: string;
  metadata?: {
    amount?: number;
    type?: string;
    reason?: string;
    [key: string]: unknown;
  };
  timestamp: string; // ISO 8601
  userAgent: string;
}
```

### Réponse
```typescript
// Succès (201 Created)
{
  success: true;
  statusCode: 201;
  message: "Log enregistré";
  data: {
    logId: string;
    timestamp: string;
  };
}

// Erreur (400/401/500)
{
  success: false;
  statusCode: number;
  message: string;
  error?: {
    code: string;
    details?: unknown;
  };
}
```

### Validation
- Vérifier que `adminId` correspond à l'utilisateur authentifié
- Vérifier que les champs obligatoires sont présents
- Valider le format de `timestamp`

### Stockage
- Enregistrer dans une table `audit_logs` avec :
  - `id` (UUID)
  - `type` (enum)
  - `admin_id` (FK vers users)
  - `user_id` (nullable, FK vers users)
  - `partner_id` (nullable, FK vers partners)
  - `transaction_id` (nullable)
  - `action` (text, nullable)
  - `metadata` (JSONB)
  - `ip_address` (extraite des headers)
  - `user_agent` (text)
  - `created_at` (timestamp)
- **Conservation**: 12 mois minimum (RGPD)
- **Index**: Sur `admin_id`, `user_id`, `type`, `created_at` pour recherches rapides

### Exemple d'implémentation (Node.js/Express)
```typescript
router.post('/admin/audit/log', authenticateAdmin, async (req, res) => {
  const { type, userId, partnerId, transactionId, action, metadata, timestamp, userAgent } = req.body;
  const adminId = req.user.id; // Depuis le middleware d'authentification
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';

  try {
    const log = await db.auditLogs.create({
      type,
      adminId,
      userId: userId || null,
      partnerId: partnerId || null,
      transactionId: transactionId || null,
      action: action || null,
      metadata: metadata || {},
      ipAddress,
      userAgent,
      createdAt: new Date(timestamp),
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Log enregistré',
      data: {
        logId: log.id,
        timestamp: log.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Erreur enregistrement audit log:', error);
    res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Erreur serveur',
    });
  }
});
```

---

## 2. Vérification des Permissions Côté Serveur

### Principe
Chaque endpoint doit vérifier que l'utilisateur authentifié a la permission nécessaire pour effectuer l'action.

### Middleware de vérification
```typescript
// middleware/checkPermission.ts
export const checkPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // Depuis authenticateAdmin
    const userPermissions = getUserPermissions(user.role);

    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        statusCode: 403,
        message: 'Accès non autorisé',
        error: {
          code: 'FORBIDDEN',
          details: `Permission requise: ${requiredPermission}`,
        },
      });
    }

    next();
  };
};
```

### Mapping des permissions par rôle
```typescript
// utils/permissions.ts
export const PERMISSIONS_BY_ROLE = {
  admin: [
    'users:view',
    'users:view_email',
    'users:view_sensitive',
    'users:modify',
    'users:modify_wallet',
    'users:modify_kyc',
    'users:reset_password',
    'powens:view',
    'powens:modify',
    'transactions:view',
    'transactions:modify',
    'transactions:flag',
    'partners:view',
    'partners:modify',
    'statistics:view',
    'statistics:export',
    'rewards:view',
    'rewards:modify',
    'offers:view',
    'offers:modify',
  ],
  support: [
    'users:view',
    'users:view_email',
    'transactions:view',
    'partners:view',
    'statistics:view',
    'rewards:view',
    'offers:view',
  ],
  partner_manager: [
    'partners:view',
    'partners:modify',
    'transactions:view',
    'statistics:view',
    'offers:view',
    'offers:modify',
  ],
};

export const getUserPermissions = (role: string): string[] => {
  return PERMISSIONS_BY_ROLE[role] || [];
};
```

### Exemples d'utilisation

#### Endpoint utilisateurs
```typescript
// GET /admin/users/:id
router.get(
  '/admin/users/:id',
  authenticateAdmin,
  checkPermission('users:view'),
  async (req, res) => {
    // ...
  }
);

// PATCH /admin/users/:id/wallet
router.patch(
  '/admin/users/:id/wallet',
  authenticateAdmin,
  checkPermission('users:modify_wallet'),
  async (req, res) => {
    // ...
  }
);
```

#### Endpoint Powens
```typescript
// GET /admin/powens/overview
router.get(
  '/admin/powens/overview',
  authenticateAdmin,
  checkPermission('powens:view'),
  async (req, res) => {
    // ...
  }
);
```

#### Endpoint transactions
```typescript
// GET /admin/transactions
router.get(
  '/admin/transactions',
  authenticateAdmin,
  checkPermission('transactions:view'),
  async (req, res) => {
    // ...
  }
);

// POST /admin/transactions/:id/flag
router.post(
  '/admin/transactions/:id/flag',
  authenticateAdmin,
  checkPermission('transactions:flag'),
  async (req, res) => {
    // ...
  }
);
```

### Masquage des données selon permissions

Pour les endpoints qui retournent des données utilisateur :

```typescript
// GET /admin/users
router.get(
  '/admin/users',
  authenticateAdmin,
  checkPermission('users:view'),
  async (req, res) => {
    const user = req.user;
    const hasEmailPermission = getUserPermissions(user.role).includes('users:view_email');
    const hasSensitivePermission = getUserPermissions(user.role).includes('users:view_sensitive');

    const users = await db.users.findMany();
    
    const maskedUsers = users.map(u => ({
      ...u,
      // Masquer l'email si pas la permission
      email: hasEmailPermission ? u.email : maskEmail(u.email),
      // Masquer les données sensibles si pas la permission
      age: hasSensitivePermission ? u.age : undefined,
      gender: hasSensitivePermission ? u.gender : undefined,
    }));

    res.json({
      success: true,
      statusCode: 200,
      data: maskedUsers,
    });
  }
);
```

---

## 3. Protection CSRF

### Principe
Ajouter des tokens CSRF pour protéger contre les attaques Cross-Site Request Forgery.

### Génération du token
```typescript
// middleware/csrf.ts
import crypto from 'crypto';

export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const setCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
};
```

### Vérification du token
```typescript
export const verifyCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = req.session.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: 'Token CSRF invalide',
      error: {
        code: 'CSRF_TOKEN_INVALID',
      },
    });
  }

  next();
};
```

### Utilisation
```typescript
// Routes GET : générer le token
router.get('/admin/*', authenticateAdmin, setCSRFToken, (req, res) => {
  // Inclure le token dans la réponse (meta tag ou header)
  res.setHeader('X-CSRF-Token', res.locals.csrfToken);
  // ...
});

// Routes POST/PUT/PATCH/DELETE : vérifier le token
router.post('/admin/*', authenticateAdmin, verifyCSRFToken, (req, res) => {
  // ...
});

router.patch('/admin/*', authenticateAdmin, verifyCSRFToken, (req, res) => {
  // ...
});

router.delete('/admin/*', authenticateAdmin, verifyCSRFToken, (req, res) => {
  // ...
});
```

### Injection du token dans la réponse HTML
```typescript
// Pour les pages HTML (si applicable)
app.use((req, res, next) => {
  res.locals.csrfToken = req.session.csrfToken;
  next();
});
```

Dans le template HTML :
```html
<meta name="csrf-token" content="{{ csrfToken }}">
```

---

## 4. Endpoints à Sécuriser

### Liste complète des endpoints à protéger

#### Authentification
- `POST /auth/login` - Pas de permission requise
- `POST /auth/refresh` - Vérifier token valide
- `POST /auth/logout` - Vérifier authentification

#### Utilisateurs
- `GET /admin/users` - `users:view`
- `GET /admin/users/:id` - `users:view`
- `PATCH /admin/users/:id` - `users:modify`
- `PATCH /admin/users/:id/wallet` - `users:modify_wallet`
- `POST /admin/users/:id/kyc/force` - `users:modify_kyc`
- `POST /admin/users/:id/password/reset` - `users:reset_password`

#### Powens (Données bancaires - DSP2)
- `GET /admin/powens/overview` - `powens:view`
- `GET /admin/powens/webhooks` - `powens:view`
- `POST /admin/powens/links/:id/refresh` - `powens:modify`
- `POST /admin/powens/webhooks/trigger` - `powens:modify`

#### Transactions
- `GET /admin/transactions` - `transactions:view`
- `GET /admin/transactions/:id` - `transactions:view`
- `POST /admin/transactions` - `transactions:modify`
- `POST /admin/transactions/:id/flag` - `transactions:flag`

#### Partenaires
- `GET /admin/partners` - `partners:view`
- `GET /admin/partners/:id` - `partners:view`
- `POST /admin/partners` - `partners:modify`
- `PATCH /admin/partners/:id` - `partners:modify`

#### Statistiques
- `GET /admin/statistics/table` - `statistics:view`
- `GET /admin/statistics/departments` - `statistics:view`
- `GET /admin/statistics/export` - `statistics:export`

#### Récompenses
- `GET /admin/rewards` - `rewards:view`
- `POST /admin/rewards` - `rewards:modify`
- `PATCH /admin/rewards/:id` - `rewards:modify`

#### Offres
- `GET /admin/offers` - `offers:view`
- `POST /admin/offers` - `offers:modify`
- `PATCH /admin/offers/:id` - `offers:modify`

#### Audit
- `POST /admin/audit/log` - Vérifier authentification (tous les admins peuvent logger)

---

## 5. Rate Limiting

### Implémentation recommandée
```typescript
import rateLimit from 'express-rate-limit';

// Rate limiting général
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par fenêtre
  message: 'Trop de requêtes, veuillez réessayer plus tard',
});

// Rate limiting pour les endpoints sensibles
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 requêtes par fenêtre
  message: 'Trop de tentatives, veuillez réessayer plus tard',
});

// Rate limiting pour l'authentification
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentatives de connexion
  message: 'Trop de tentatives de connexion, veuillez réessayer plus tard',
});
```

### Utilisation
```typescript
// Endpoints sensibles
router.post('/admin/users/:id/wallet', 
  authLimiter,
  authenticateAdmin,
  checkPermission('users:modify_wallet'),
  verifyCSRFToken,
  async (req, res) => {
    // ...
  }
);

// Authentification
router.post('/auth/login', authLimiter, async (req, res) => {
  // ...
});
```

---

## 6. Conservation des Logs (RGPD)

### Durée de conservation
- **Logs d'audit**: 12 mois minimum (RGPD article 30)
- **Logs d'erreur**: 6 mois
- **Logs d'accès**: 3 mois

### Script de nettoyage
```typescript
// scripts/cleanup-audit-logs.ts
import { db } from './db';

export const cleanupAuditLogs = async () => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const deleted = await db.auditLogs.deleteMany({
    where: {
      createdAt: {
        lt: twelveMonthsAgo,
      },
    },
  });

  console.log(`Supprimé ${deleted.count} logs d'audit de plus de 12 mois`);
};
```

### Planification (Cron)
```typescript
// Exécuter tous les jours à 2h du matin
cron.schedule('0 2 * * *', async () => {
  await cleanupAuditLogs();
});
```

---

## 7. Checklist d'Implémentation Backend

- [ ] Créer la table `audit_logs` avec les champs requis
- [ ] Implémenter `POST /admin/audit/log`
- [ ] Créer le middleware `checkPermission`
- [ ] Ajouter la vérification de permissions sur tous les endpoints
- [ ] Implémenter le masquage des données selon permissions
- [ ] Ajouter la protection CSRF (génération et vérification)
- [ ] Implémenter le rate limiting
- [ ] Créer le script de nettoyage des logs
- [ ] Configurer le cron pour le nettoyage automatique
- [ ] Tester tous les endpoints avec différents rôles
- [ ] Documenter les permissions dans l'API

---

## 8. Tests Backend Recommandés

### Tests unitaires
- Vérification des permissions par rôle
- Validation des tokens CSRF
- Masquage des données selon permissions

### Tests d'intégration
- Endpoint d'audit avec différents types d'événements
- Accès refusé pour permissions insuffisantes
- Rate limiting fonctionnel

### Tests de sécurité
- Tentative d'accès sans token
- Tentative d'accès avec token invalide
- Tentative d'accès avec permissions insuffisantes
- Tentative de CSRF sans token
- Tentative de rate limiting

---

**Note**: Ces spécifications doivent être adaptées selon votre stack technique (Node.js, Python, Java, etc.) et votre architecture.

