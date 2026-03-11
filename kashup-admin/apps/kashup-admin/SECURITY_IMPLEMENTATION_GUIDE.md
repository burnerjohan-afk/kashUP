# Guide d'Implémentation des Correctifs de Sécurité

Ce guide montre comment intégrer les correctifs de sécurité dans le code existant.

## 1. Intégration de la journalisation d'audit

### Exemple: `user-detail-content.tsx`

```typescript
import { useEffect } from 'react';
import { useAuditLog } from '@/lib/audit/audit-logger';

export const UserDetailContent = ({ user }: UserDetailContentProps) => {
  const auditLog = useAuditLog();

  // Logger l'accès à la fiche utilisateur
  useEffect(() => {
    if (user?.id) {
      auditLog.logUserView(user.id);
    }
  }, [user?.id, auditLog]);

  // Logger les modifications
  const walletMutation = useMutation({
    mutationFn: (payload: WalletAdjustmentInput) => adjustWallet(user.id, payload),
    onSuccess: (data, variables) => {
      auditLog.logWalletAdjust(
        user.id,
        variables.amount,
        variables.type,
        variables.reason
      );
      toast.success('Wallet mis à jour');
    },
    // ...
  });

  const kycMutation = useMutation({
    mutationFn: () => forceUserKyc(user.id),
    onSuccess: () => {
      auditLog.logKycForce(user.id);
      toast.success('KYC forcé avec succès');
    },
    // ...
  });

  const resetMutation = useMutation({
    mutationFn: () => resetUserPassword(user.id),
    onSuccess: () => {
      auditLog.logPasswordReset(user.id);
      toast.success('Lien de réinitialisation envoyé');
    },
    // ...
  });

  // ... reste du code
};
```

## 2. Intégration du contrôle d'accès granulaire

### Exemple: Masquer l'email selon les permissions

```typescript
import { usePermissions } from '@/lib/permissions/permissions';
import { maskEmail } from '@/lib/utils/privacy';

export const UsersPage = () => {
  const { hasPermission } = usePermissions();
  const canViewEmail = hasPermission('users:view_email');

  const columns = useMemo(() => [
    {
      header: 'Utilisateur',
      accessorKey: 'fullName',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-ink">{row.original.fullName}</p>
          <p className="text-xs text-ink/60">
            {canViewEmail 
              ? row.original.email 
              : maskEmail(row.original.email)}
          </p>
        </div>
      ),
    },
    // ...
  ], [canViewEmail]);
};
```

### Exemple: Protéger les actions sensibles

```typescript
import { PermissionGuard } from '@/lib/permissions/permissions';

export const UserDetailContent = ({ user }: UserDetailContentProps) => {
  return (
    <div>
      {/* Masquer les données sensibles si pas la permission */}
      <PermissionGuard
        permission="users:view_sensitive"
        fallback={<p className="text-ink/50">Données sensibles masquées</p>}
      >
        {user.age && (
          <div>
            <p className="text-xs uppercase text-ink/40">Âge</p>
            <p className="text-sm text-ink">{user.age} ans</p>
          </div>
        )}
        {user.gender && (
          <div>
            <p className="text-xs uppercase text-ink/40">Sexe</p>
            <p className="text-sm capitalize text-ink">{user.gender}</p>
          </div>
        )}
      </PermissionGuard>

      {/* Masquer les actions de modification si pas la permission */}
      <PermissionGuard permission="users:modify_wallet">
        <Card title="Créditer / débiter">
          {/* Formulaire wallet */}
        </Card>
      </PermissionGuard>

      <PermissionGuard permission="users:modify_kyc">
        <Button onClick={() => void kycMutation.mutate()}>
          Forcer KYC
        </Button>
      </PermissionGuard>
    </div>
  );
};
```

## 3. Intégration de l'expiration de session

### Dans `app-providers.tsx` ou `app-shell.tsx`

```typescript
import { SessionWarning } from '@/lib/auth/session-manager';

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
        <SessionWarning />
      </ThemeProvider>
    </QueryClientProvider>
  );
};
```

## 4. Sécurisation du stockage des tokens

### Modification de `auth-store.ts`

**⚠️ IMPORTANT**: Cette modification nécessite aussi des changements backend.

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ... état
    }),
    {
      name: 'kashup-admin-auth',
      // Utiliser sessionStorage au lieu de localStorage
      storage: createJSONStorage(() => sessionStorage),
      // Ne PAS stocker les tokens côté client
      // Les tokens doivent être gérés par le backend via cookies HttpOnly
      partialize: (state) => ({
        // Ne stocker que l'état minimal
        user: state.user,
        roles: state.roles,
        isAuthenticated: state.isAuthenticated,
        // ⚠️ NE PAS stocker accessToken/refreshToken
        // Ils doivent être dans des cookies HttpOnly gérés par le backend
      }),
    },
  ),
);
```

**Note**: Pour une sécurité maximale, les tokens doivent être gérés par le backend via cookies HttpOnly. Cela nécessite des modifications backend.

## 5. Masquage des données Powens

### Exemple: `powens-page.tsx`

```typescript
import { usePermissions } from '@/lib/permissions/permissions';
import { useAuditLog } from '@/lib/audit/audit-logger';
import { maskAccountNumber } from '@/lib/utils/privacy';

export const PowensPage = () => {
  const { hasPermission } = usePermissions();
  const auditLog = useAuditLog();
  const canViewPowens = hasPermission('powens:view');

  // Logger l'accès aux données Powens
  useEffect(() => {
    if (overviewQuery.data?.links) {
      overviewQuery.data.links.forEach(link => {
        // Logger l'accès (nécessite userId dans les données Powens)
        // auditLog.logPowensAccess(link.userId);
      });
    }
  }, [overviewQuery.data]);

  if (!canViewPowens) {
    return (
      <Card>
        <p className="text-ink/50">Accès non autorisé aux données bancaires</p>
      </Card>
    );
  }

  return (
    <div>
      {/* Masquer les identifiants de comptes */}
      {links.map((link) => (
        <div key={link.id}>
          <p>{link.bank}</p>
          <p className="text-xs">
            {hasPermission('powens:view') 
              ? `${link.accounts} comptes connectés`
              : 'Données masquées'}
          </p>
        </div>
      ))}
    </div>
  );
};
```

## 6. Checklist d'intégration

Pour chaque page/composant qui affiche des données personnelles :

- [ ] Ajouter `useAuditLog()` et logger les accès
- [ ] Vérifier les permissions avec `usePermissions()`
- [ ] Masquer les données sensibles avec `maskEmail()`, `maskIBAN()`, etc.
- [ ] Utiliser `PermissionGuard` pour protéger les sections sensibles
- [ ] Logger toutes les modifications (wallet, KYC, password, etc.)
- [ ] Tester avec différents rôles (admin, support, partner_manager)

## 7. Modifications backend requises

Les correctifs frontend doivent être complétés par :

1. **Endpoint d'audit**: `POST /admin/audit/log`
2. **Vérification des permissions côté serveur** pour chaque endpoint
3. **Cookies HttpOnly** pour les tokens (remplace localStorage)
4. **Protection CSRF** avec tokens
5. **Rate limiting** sur les endpoints sensibles
6. **Conservation des logs** 12 mois minimum

## 8. Tests de sécurité

Avant mise en production, tester :

- [ ] Un utilisateur `support` ne peut pas voir les données sensibles
- [ ] Un utilisateur `partner_manager` ne peut pas accéder aux données utilisateurs
- [ ] Les logs d'audit sont créés pour chaque accès/modification
- [ ] La session expire après 15 minutes d'inactivité
- [ ] Les tokens ne sont pas accessibles via XSS (si localStorage)
- [ ] Les emails sont masqués pour les rôles sans permission

