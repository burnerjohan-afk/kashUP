# Guide de Test de Sécurité

Ce guide décrit comment tester les fonctionnalités de sécurité implémentées.

---

## 1. Tests de Permissions

### Prérequis
- Avoir 3 comptes de test avec les rôles : `admin`, `support`, `partner_manager`

### Test 1 : Rôle Support
1. Se connecter avec un compte `support`
2. Naviguer vers `/users`
3. **Vérifier** : Les emails doivent être masqués (ex: `jo***@example.com`)
4. Ouvrir une fiche utilisateur
5. **Vérifier** : 
   - L'email complet ne doit pas être visible
   - L'âge et le genre ne doivent pas être visibles
   - Les boutons "Reset mot de passe" et "Forcer KYC" ne doivent pas être visibles
   - Le formulaire "Créditer / débiter" ne doit pas être accessible
6. Naviguer vers `/powens`
7. **Vérifier** : Un message "Accès non autorisé" doit s'afficher

### Test 2 : Rôle Partner Manager
1. Se connecter avec un compte `partner_manager`
2. Naviguer vers `/users`
3. **Vérifier** : La page ne doit pas être accessible (redirection ou message d'erreur)
4. Naviguer vers `/partners`
5. **Vérifier** : La page doit être accessible
6. Naviguer vers `/powens`
7. **Vérifier** : Un message "Accès non autorisé" doit s'afficher

### Test 3 : Rôle Admin
1. Se connecter avec un compte `admin`
2. Naviguer vers toutes les pages
3. **Vérifier** : Toutes les pages doivent être accessibles
4. Ouvrir une fiche utilisateur
5. **Vérifier** :
   - L'email complet doit être visible
   - L'âge et le genre doivent être visibles
   - Tous les boutons d'action doivent être visibles
   - Le formulaire wallet doit être accessible

---

## 2. Tests de Journalisation d'Audit

### Prérequis
- Ouvrir la console du navigateur (F12)
- Avoir un endpoint backend `POST /admin/audit/log` fonctionnel (ou vérifier les appels réseau)

### Test 1 : Log d'accès utilisateur
1. Se connecter avec un compte admin
2. Ouvrir la console du navigateur
3. Naviguer vers `/users` et ouvrir une fiche utilisateur
4. **Vérifier** : Dans l'onglet Network, un appel `POST /admin/audit/log` doit être visible avec :
   ```json
   {
     "type": "user_view",
     "userId": "...",
     "adminId": "...",
     "timestamp": "..."
   }
   ```

### Test 2 : Log de modification wallet
1. Ouvrir une fiche utilisateur
2. Remplir le formulaire "Créditer / débiter" :
   - Type: Crédit
   - Source: Cashback
   - Montant: 100
   - Raison: "Test audit"
3. Cliquer sur "Enregistrer"
4. **Vérifier** : Un appel `POST /admin/audit/log` doit être visible avec :
   ```json
   {
     "type": "wallet_adjust",
     "userId": "...",
     "metadata": {
       "amount": 100,
       "type": "credit",
       "reason": "Test audit"
     }
   }
   ```

### Test 3 : Log d'action KYC
1. Ouvrir une fiche utilisateur
2. Cliquer sur "Forcer KYC"
3. **Vérifier** : Un appel `POST /admin/audit/log` doit être visible avec :
   ```json
   {
     "type": "kyc_force",
     "userId": "..."
   }
   ```

### Test 4 : Log de reset password
1. Ouvrir une fiche utilisateur
2. Cliquer sur "Reset mot de passe"
3. **Vérifier** : Un appel `POST /admin/audit/log` doit être visible avec :
   ```json
   {
     "type": "password_reset",
     "userId": "..."
   }
   ```

---

## 3. Tests d'Expiration de Session

### Test 1 : Warning d'expiration
1. Se connecter
2. Attendre 13 minutes sans activité (ou modifier `WARNING_TIME` dans `session-manager.ts` pour tester plus rapidement)
3. **Vérifier** : Un warning doit apparaître en bas à droite :
   ```
   ⚠️ Votre session expire dans X:XX
   [Prolonger]
   ```

### Test 2 : Prolongation de session
1. Attendre l'apparition du warning
2. Cliquer sur "Prolonger"
3. **Vérifier** : Le warning doit disparaître
4. Attendre encore 13 minutes
5. **Vérifier** : Le warning ne doit pas réapparaître (activité récente)

### Test 3 : Déconnexion automatique
1. Se connecter
2. Attendre 15 minutes sans activité (ou modifier `SESSION_TIMEOUT` pour tester plus rapidement)
3. **Vérifier** : 
   - Redirection automatique vers `/login?reason=timeout`
   - Session déconnectée

### Test 4 : Réinitialisation du timer
1. Se connecter
2. Attendre 12 minutes
3. Bouger la souris ou cliquer quelque part
4. Attendre encore 13 minutes
5. **Vérifier** : Le warning ne doit pas apparaître (timer réinitialisé)

---

## 4. Tests de Masquage des Données

### Test 1 : Masquage des emails
1. Se connecter avec un compte `support`
2. Naviguer vers `/users`
3. **Vérifier** : Les emails doivent être masqués :
   - `john.doe@example.com` → `jo***@example.com`
   - `admin@test.com` → `ad***@test.com`

### Test 2 : Masquage des données sensibles
1. Se connecter avec un compte `support`
2. Ouvrir une fiche utilisateur
3. **Vérifier** :
   - L'âge ne doit pas être affiché
   - Le genre ne doit pas être affiché
   - Un message "Données sensibles masquées" peut être affiché

### Test 3 : Affichage complet pour admin
1. Se connecter avec un compte `admin`
2. Naviguer vers `/users`
3. **Vérifier** : Les emails doivent être complets
4. Ouvrir une fiche utilisateur
5. **Vérifier** : L'âge et le genre doivent être visibles

---

## 5. Tests de Protection CSRF

### Prérequis
- Le backend doit envoyer un token CSRF dans les headers de réponse ou dans un meta tag

### Test 1 : Présence du token
1. Se connecter
2. Ouvrir la console du navigateur
3. Faire une requête POST (ex: modifier un wallet)
4. **Vérifier** : Dans l'onglet Network, le header `X-CSRF-Token` doit être présent

### Test 2 : Stockage du token
1. Se connecter
2. Ouvrir la console du navigateur
3. Exécuter : `sessionStorage.getItem('csrf-token')`
4. **Vérifier** : Un token doit être présent (si le backend l'envoie)

---

## 6. Tests de Sécurité du Stockage

### Test 1 : SessionStorage au lieu de localStorage
1. Se connecter
2. Ouvrir la console du navigateur
3. Exécuter : `localStorage.getItem('kashup-admin-auth')`
4. **Vérifier** : Doit retourner `null` (pas de stockage dans localStorage)
5. Exécuter : `sessionStorage.getItem('kashup-admin-auth')`
6. **Vérifier** : Doit retourner un objet JSON avec les données d'authentification

### Test 2 : Fermeture de l'onglet
1. Se connecter
2. Fermer l'onglet du navigateur
3. Rouvrir l'onglet et naviguer vers l'application
4. **Vérifier** : Doit demander une nouvelle connexion (sessionStorage effacé)

---

## 7. Checklist Complète de Test

### Permissions
- [ ] Support ne voit pas les emails complets
- [ ] Support ne voit pas les données sensibles
- [ ] Support ne peut pas modifier le wallet
- [ ] Support ne peut pas accéder à Powens
- [ ] Partner Manager ne peut pas accéder aux utilisateurs
- [ ] Admin a tous les accès

### Audit
- [ ] Log d'accès utilisateur fonctionne
- [ ] Log de modification wallet fonctionne
- [ ] Log d'action KYC fonctionne
- [ ] Log de reset password fonctionne
- [ ] Les logs ne bloquent pas les actions en cas d'erreur

### Session
- [ ] Warning apparaît à 13 minutes
- [ ] Déconnexion à 15 minutes
- [ ] Prolongation de session fonctionne
- [ ] Réinitialisation du timer sur activité

### Masquage
- [ ] Emails masqués pour support
- [ ] Données sensibles masquées pour support
- [ ] Données complètes pour admin

### CSRF
- [ ] Token CSRF présent dans les requêtes POST/PUT/PATCH/DELETE
- [ ] Token stocké correctement

### Stockage
- [ ] Tokens dans sessionStorage (pas localStorage)
- [ ] Session effacée à la fermeture de l'onglet

---

## 8. Tests Automatisés

### Exécuter les tests unitaires
```bash
npm run test
```

### Tests spécifiques
```bash
# Tests de permissions
npm run test src/tests/security/permissions.test.tsx

# Tests d'audit
npm run test src/tests/security/audit-logger.test.ts
```

---

## 9. Tests de Performance

### Test de charge des logs
1. Ouvrir plusieurs fiches utilisateurs rapidement
2. **Vérifier** : Les logs ne doivent pas ralentir l'application
3. **Vérifier** : Les erreurs de log ne doivent pas bloquer l'UI

---

## 10. Rapport de Test

Après avoir effectué tous les tests, remplir ce rapport :

```
Date: __________
Testeur: __________

Permissions:
- Support: [ ] OK [ ] KO
- Partner Manager: [ ] OK [ ] KO
- Admin: [ ] OK [ ] KO

Audit:
- Logs fonctionnels: [ ] OK [ ] KO
- Endpoint backend: [ ] OK [ ] KO

Session:
- Warning: [ ] OK [ ] KO
- Déconnexion: [ ] OK [ ] KO

Masquage:
- Emails: [ ] OK [ ] KO
- Données sensibles: [ ] OK [ ] KO

CSRF:
- Token présent: [ ] OK [ ] KO

Stockage:
- SessionStorage: [ ] OK [ ] KO

Problèmes identifiés:
_________________________________________________
_________________________________________________
_________________________________________________

Recommandations:
_________________________________________________
_________________________________________________
```

---

**Note**: Ces tests doivent être effectués avant chaque déploiement en production.

