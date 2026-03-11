# Audit de Sécurité et Conformité RGPD/DSP2/KYC
## Back-Office Kashup Admin

**Date**: 2024  
**Version**: 1.0  
**Statut**: ⚠️ NON-CONFORME - Correctifs requis avant production

---

## 1. DONNÉES PERSONNELLES IDENTIFIÉES

### 1.1 Données affichées dans le back-office

| Type de donnée | Localisation | Sensibilité | Conformité actuelle |
|----------------|--------------|-------------|---------------------|
| **Email utilisateur** | `users-page.tsx`, `user-detail-content.tsx` | ⚠️ Moyenne | ✅ Affichage direct |
| **Nom complet** | `users-page.tsx` | ⚠️ Moyenne | ✅ Affichage direct |
| **Âge** | `user-detail-content.tsx` | ⚠️ Faible | ✅ Affichage conditionnel |
| **Genre** | `user-detail-content.tsx` | ⚠️ Faible | ✅ Affichage conditionnel |
| **Territoire** | Multiple | ✅ Faible | ✅ OK |
| **Statut KYC** | Multiple | ⚠️ Moyenne | ✅ OK |
| **Solde cashback/points** | `user-detail-content.tsx` | ⚠️ Moyenne | ✅ OK |
| **Transactions** | `user-detail-content.tsx`, `transactions-page.tsx` | ⚠️ Moyenne | ✅ OK |
| **Données Powens (bancaires)** | `powens-page.tsx` | 🔴 **CRITIQUE** | ⚠️ **NON-CONFORME** |
| **Tokens d'authentification** | `auth-store.ts` (localStorage) | 🔴 **CRITIQUE** | ⚠️ **NON-CONFORME** |

### 1.2 Données bancaires (DSP2)

**⚠️ PROBLÈME CRITIQUE** : Aucune donnée bancaire directe (IBAN, numéro de carte) n'est affichée, mais :
- Les liens Powens exposent des métadonnées bancaires (banque, comptes connectés)
- Pas de masquage visible des données sensibles
- Pas de log d'accès aux données bancaires

---

## 2. PROBLÈMES DE SÉCURITÉ IDENTIFIÉS

### 🔴 CRITIQUE - Obligatoire avant production

#### 2.1 Stockage des tokens dans localStorage
**Fichier**: `apps/kashup-admin/src/store/auth-store.ts`

**Problème**:
```typescript
persist(
  (set) => ({ ... }),
  {
    name: 'kashup-admin-auth',
    partialize: (state) => ({
      accessToken: state.accessToken,  // ⚠️ Stocké en localStorage
      refreshToken: state.refreshToken, // ⚠️ Stocké en localStorage
      ...
    }),
  }
)
```

**Risque**: 
- XSS peut voler les tokens depuis localStorage
- Pas de protection HttpOnly (cookies)
- Tokens accessibles à tout script injecté

**Correctif requis**:
- Utiliser des cookies HttpOnly pour les tokens (backend)
- Ou sessionStorage avec rotation fréquente
- Ajouter un mécanisme de CSRF

#### 2.2 Absence de journalisation d'audit
**Problème**: Aucun log d'accès aux données personnelles

**Risque RGPD**: 
- Impossible de tracer qui a consulté/modifié quelles données
- Non-conformité article 30 RGPD (registre des activités de traitement)

**Correctif requis**:
- Logger tous les accès aux fiches utilisateurs
- Logger les modifications sensibles (wallet, KYC, password reset)
- Conserver les logs 12 mois minimum

#### 2.3 Absence de contrôle d'accès granulaire (RBAC)
**Fichier**: `apps/kashup-admin/src/lib/hooks/use-permissions.ts`

**Problème**:
```typescript
const hasRole = (allowed: UserRole | UserRole[]) => {
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.some((role) => roles.includes(role));
};
```

**Risque**:
- Pas de vérification côté serveur visible
- Pas de permissions granulaires (ex: "voir email" vs "modifier wallet")
- Tous les admins ont accès à tout

**Correctif requis**:
- Implémenter un système de permissions granulaires
- Vérifier les permissions côté serveur pour chaque action
- Masquer les données selon le rôle

#### 2.4 Pas d'expiration de session visible
**Fichier**: `apps/kashup-admin/src/lib/api/client.ts`

**Problème**:
- Refresh token automatique mais pas d'expiration visible
- Pas de déconnexion automatique après inactivité
- Session peut rester active indéfiniment

**Correctif requis**:
- Déconnexion automatique après 15-30 min d'inactivité
- Afficher un warning avant expiration
- Forcer la reconnexion périodique

### ⚠️ IMPORTANT - Recommandé avant production

#### 2.5 Affichage non masqué des emails
**Fichier**: `apps/kashup-admin/src/features/users/pages/users-page.tsx`

**Problème**:
```typescript
<p className="text-xs text-ink/60">{row.original.email}</p>
```

**Recommandation**:
- Masquer partiellement les emails (ex: `j***@example.com`)
- Afficher complet uniquement sur clic avec justification

#### 2.6 Pas de protection CSRF
**Problème**: Aucun token CSRF visible dans les requêtes

**Recommandation**:
- Ajouter des tokens CSRF pour les mutations
- Vérifier côté serveur

#### 2.7 Données Powens sans masquage
**Fichier**: `apps/kashup-admin/src/features/powens/pages/powens-page.tsx`

**Problème**:
- Affichage direct des métadonnées bancaires
- Pas de log d'accès spécifique

**Recommandation**:
- Masquer les identifiants de comptes
- Logger tous les accès aux données Powens
- Restreindre l'accès aux rôles autorisés

### ✅ OPTIONNEL - Améliorations

#### 2.8 Pas de chiffrement côté client
**Recommandation**: Chiffrer les données sensibles en transit (déjà fait via HTTPS, mais vérifier)

#### 2.9 Pas de rate limiting visible
**Recommandation**: Limiter les tentatives de connexion

---

## 3. CORRECTIFS PROPOSÉS

### 3.1 Sécurisation du stockage des tokens

**Fichier**: `apps/kashup-admin/src/store/auth-store.ts`

```typescript
// AVANT (NON-SÉCURISÉ)
persist(
  (set) => ({ ... }),
  { name: 'kashup-admin-auth', ... }
)

// APRÈS (SÉCURISÉ)
// Option 1: SessionStorage (moins persistant, plus sûr)
persist(
  (set) => ({ ... }),
  { 
    name: 'kashup-admin-auth',
    storage: {
      getItem: (name) => sessionStorage.getItem(name),
      setItem: (name, value) => sessionStorage.setItem(name, value),
      removeItem: (name) => sessionStorage.removeItem(name),
    },
    // Ne pas stocker les tokens, seulement l'état auth
    partialize: (state) => ({
      user: state.user,
      roles: state.roles,
      isAuthenticated: state.isAuthenticated,
      // ⚠️ NE PAS stocker accessToken/refreshToken
    }),
  }
)

// Option 2: Cookies HttpOnly (nécessite backend)
// Les tokens doivent être gérés par le backend via cookies HttpOnly
```

### 3.2 Ajout de journalisation d'audit

**Nouveau fichier**: `apps/kashup-admin/src/lib/audit/audit-logger.ts`

```typescript
type AuditEvent = 
  | { type: 'user_view', userId: string, adminId: string }
  | { type: 'user_modify', userId: string, adminId: string, action: string }
  | { type: 'wallet_adjust', userId: string, adminId: string, amount: number }
  | { type: 'kyc_force', userId: string, adminId: string }
  | { type: 'password_reset', userId: string, adminId: string }
  | { type: 'powens_access', userId: string, adminId: string };

export const logAuditEvent = async (event: AuditEvent) => {
  try {
    await apiClient.post('admin/audit/log', {
      ...event,
      timestamp: new Date().toISOString(),
      ip: await getClientIP(), // À implémenter
      userAgent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Ne pas bloquer l'action si le log échoue
  }
};
```

**Utilisation dans les composants**:

```typescript
// apps/kashup-admin/src/features/users/components/user-detail-content.tsx
useEffect(() => {
  if (user?.id) {
    logAuditEvent({
      type: 'user_view',
      userId: user.id,
      adminId: useAuthStore.getState().user?.id || 'unknown',
    });
  }
}, [user?.id]);
```

### 3.3 Contrôle d'accès granulaire

**Nouveau fichier**: `apps/kashup-admin/src/lib/permissions/permissions.ts`

```typescript
export type Permission = 
  | 'users:view'
  | 'users:view_email'
  | 'users:view_sensitive'
  | 'users:modify'
  | 'users:modify_wallet'
  | 'users:modify_kyc'
  | 'users:reset_password'
  | 'powens:view'
  | 'transactions:view'
  | 'transactions:modify'
  | 'partners:view'
  | 'partners:modify';

export const PERMISSIONS_BY_ROLE: Record<UserRole, Permission[]> = {
  admin: [
    'users:view',
    'users:view_email',
    'users:view_sensitive',
    'users:modify',
    'users:modify_wallet',
    'users:modify_kyc',
    'users:reset_password',
    'powens:view',
    'transactions:view',
    'transactions:modify',
    'partners:view',
    'partners:modify',
  ],
  support: [
    'users:view',
    'users:view_email',
    'transactions:view',
    'partners:view',
  ],
  partner_manager: [
    'partners:view',
    'partners:modify',
    'transactions:view',
  ],
};

export const usePermissions = () => {
  const roles = useAuthStore((state) => state.roles);
  
  const permissions = useMemo(() => {
    const all: Permission[] = [];
    roles.forEach(role => {
      all.push(...PERMISSIONS_BY_ROLE[role]);
    });
    return [...new Set(all)]; // Dédupliquer
  }, [roles]);

  const hasPermission = (permission: Permission) => {
    return permissions.includes(permission);
  };

  return { permissions, hasPermission };
};
```

**Utilisation**:

```typescript
// Masquer l'email si pas la permission
const { hasPermission } = usePermissions();
{hasPermission('users:view_email') ? (
  <p>{user.email}</p>
) : (
  <p>{maskEmail(user.email)}</p>
)}
```

### 3.4 Expiration de session

**Nouveau fichier**: `apps/kashup-admin/src/lib/auth/session-manager.ts`

```typescript
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_TIME = 2 * 60 * 1000; // Avertir 2 min avant

export const useSessionManager = () => {
  const { clearSession } = useAuthStore();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  useEffect(() => {
    let lastActivity = Date.now();
    let warningShown = false;

    const updateTimer = () => {
      const elapsed = Date.now() - lastActivity;
      const remaining = SESSION_TIMEOUT - elapsed;

      if (remaining <= 0) {
        clearSession();
        window.location.href = '/login?reason=timeout';
        return;
      }

      if (remaining <= WARNING_TIME && !warningShown) {
        warningShown = true;
        const extend = confirm(
          `Votre session expire dans ${Math.floor(remaining / 1000 / 60)} minutes. ` +
          `Souhaitez-vous prolonger votre session ?`
        );
        if (extend) {
          lastActivity = Date.now();
          warningShown = false;
        }
      }

      setTimeRemaining(remaining);
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const onActivity = () => {
      lastActivity = Date.now();
      warningShown = false;
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, onActivity);
    });

    const interval = setInterval(updateTimer, 1000);
    updateTimer();

    return () => {
      clearInterval(interval);
      activityEvents.forEach(event => {
        document.removeEventListener(event, onActivity);
      });
    };
  }, [clearSession]);

  return { timeRemaining };
};
```

### 3.5 Masquage des emails

**Nouveau fichier**: `apps/kashup-admin/src/lib/utils/privacy.ts`

```typescript
export const maskEmail = (email: string): string => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
};

export const maskIBAN = (iban: string): string => {
  if (iban.length < 8) return iban;
  return `****${iban.slice(-4)}`;
};
```

### 3.6 Protection CSRF

**Fichier**: `apps/kashup-admin/src/lib/api/client.ts`

```typescript
// Ajouter un token CSRF dans les headers
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

export const apiClient = ky.create({
  prefixUrl: API_BASE_URL,
  hooks: {
    beforeRequest: [
      (request) => {
        // ... existing code ...
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
          request.headers.set('X-CSRF-Token', csrfToken);
        }
      },
    ],
  },
});
```

---

## 4. PRIORISATION DES CORRECTIFS

### 🔴 OBLIGATOIRE avant production

1. ✅ **Journalisation d'audit** (RGPD article 30)
   - Logs d'accès aux données personnelles
   - Logs des modifications sensibles
   - Conservation 12 mois minimum

2. ✅ **Sécurisation des tokens**
   - Passer en sessionStorage OU cookies HttpOnly
   - Ne jamais stocker refreshToken côté client

3. ✅ **Contrôle d'accès granulaire**
   - Permissions par rôle
   - Vérification côté serveur
   - Masquage des données selon permissions

4. ✅ **Expiration de session**
   - Déconnexion après 15-30 min d'inactivité
   - Warning avant expiration

### ⚠️ RECOMMANDÉ avant production

5. ✅ **Masquage des emails**
   - Affichage partiel par défaut
   - Complet sur demande avec justification

6. ✅ **Protection CSRF**
   - Tokens CSRF pour mutations
   - Vérification côté serveur

7. ✅ **Logs d'accès Powens**
   - Journaliser tous les accès aux données bancaires
   - Restreindre l'accès aux rôles autorisés

### ✅ OPTIONNEL (améliorations)

8. Rate limiting côté front
9. Chiffrement additionnel (au-delà de HTTPS)
10. 2FA pour les admins

---

## 5. CHECKLIST DE CONFORMITÉ

### RGPD
- [ ] Registre des activités de traitement (article 30)
- [ ] Minimisation des données affichées
- [ ] Logs d'accès aux données personnelles
- [ ] Droit à l'effacement (suppression des logs après 12 mois)
- [ ] Consentement explicite pour données sensibles

### DSP2 (Directive Services de Paiement)
- [ ] Pas d'affichage de données bancaires complètes
- [ ] Masquage des identifiants de comptes
- [ ] Logs d'accès aux données bancaires
- [ ] Accès restreint aux données bancaires

### KYC
- [ ] Accès restreint aux données KYC
- [ ] Logs des modifications de statut KYC
- [ ] Traçabilité des actions KYC

### Sécurité générale
- [ ] Tokens sécurisés (sessionStorage ou HttpOnly)
- [ ] Expiration de session
- [ ] Protection CSRF
- [ ] Contrôle d'accès granulaire
- [ ] Journalisation complète

---

## 6. ACTIONS IMMÉDIATES

1. **Créer les fichiers de correctifs** (voir section 3)
2. **Implémenter la journalisation d'audit** (priorité 1)
3. **Sécuriser le stockage des tokens** (priorité 2)
4. **Ajouter le contrôle d'accès granulaire** (priorité 3)
5. **Tester en environnement de staging**
6. **Valider avec un DPO (Data Protection Officer)**

---

## 7. RÉFÉRENCES

- RGPD: https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679
- DSP2: https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32015L2366
- CNIL - Guide RGPD: https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on
- OWASP Top 10: https://owasp.org/www-project-top-ten/

---

**Statut final**: ⚠️ **NON-CONFORME** - Correctifs critiques requis avant mise en production.

