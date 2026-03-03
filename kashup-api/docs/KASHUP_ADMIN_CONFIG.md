# Configuration kashup-admin - Communication avec kashup-api

## Prompt à envoyer à kashup-admin

```
Je dois configurer mon application back office (kashup-admin) pour qu'elle communique avec l'API backend kashup-api.

**Objectif :** Tester que lorsque je crée/modifie quelque chose dans le back office, cela se transmet bien à l'API et se synchronise automatiquement avec l'application mobile via les webhooks.

**Configuration requise :**

1. **URL de base de l'API :**
   - En développement local : `http://localhost:4000`
   - En production : `https://votre-domaine-api.com` (à remplacer par l'URL réelle de production)

2. **Variable d'environnement à créer :**
   Créer ou mettre à jour un fichier `.env` dans kashup-admin avec :
   ```env
   API_BASE_URL=http://localhost:4000
   # ou en production :
   # API_BASE_URL=https://votre-domaine-api.com
   ```

3. **Endpoints exacts de l'API :**

   **Authentification :**
   - `POST http://localhost:4000/auth/login` - Connexion
   - `POST http://localhost:4000/auth/signup` - Inscription
   - `POST http://localhost:4000/auth/password/forgot` - Mot de passe oublié

   **Partenaires (admin) :**
   - `GET http://localhost:4000/partners` - Liste des partenaires (avec filtres : ?search=, ?categoryId=, ?territoire=, ?marketingProgram=)
   - `GET http://localhost:4000/partners/:id` - Détails d'un partenaire
   - `GET http://localhost:4000/partners/:id/statistics` - Statistiques d'un partenaire
   - `GET http://localhost:4000/partners/:id/documents` - Documents d'un partenaire
   - `POST http://localhost:4000/partners` - Créer un partenaire (multipart/form-data)
   - `PATCH http://localhost:4000/partners/:id` - Mettre à jour un partenaire (multipart/form-data)
   - `GET http://localhost:4000/partners/categories` - Liste des catégories
   - `POST http://localhost:4000/partners/categories` - Créer une catégorie
   - `PATCH http://localhost:4000/partners/categories/:id` - Mettre à jour une catégorie
   - `DELETE http://localhost:4000/partners/categories/:id` - Supprimer une catégorie

   **Offres (admin) :**
   - `GET http://localhost:4000/offers/current` - Offres actuelles (public)
   - `POST http://localhost:4000/offers` - Créer une offre (multipart/form-data)
   - `PATCH http://localhost:4000/offers/:id` - Mettre à jour une offre (multipart/form-data)

   **Récompenses (admin) :**
   - `GET http://localhost:4000/rewards` - Catalogue complet (tous types)
   - `GET http://localhost:4000/rewards/:type` - Récompenses par type (boost, badge, lottery, challenge)
   - `POST http://localhost:4000/rewards` - Créer une récompense (multipart/form-data)
   - `PATCH http://localhost:4000/rewards/:id` - Mettre à jour une récompense (multipart/form-data)

   **Utilisateurs (admin) :**
   - `GET http://localhost:4000/admin/users` - Liste des utilisateurs (avec filtres : ?search=, ?status=, ?territory=, ?page=, ?pageSize=)
   - `GET http://localhost:4000/admin/users/:id` - Détails d'un utilisateur
   - `GET http://localhost:4000/admin/users/:id/transactions` - Transactions d'un utilisateur
   - `GET http://localhost:4000/admin/users/:id/rewards/history` - Historique des récompenses
   - `GET http://localhost:4000/admin/users/:id/gift-cards` - Cartes cadeaux d'un utilisateur
   - `GET http://localhost:4000/admin/users/:id/statistics` - Statistiques d'un utilisateur
   - `POST http://localhost:4000/admin/users/:id/reset-password` - Réinitialiser le mot de passe
   - `PATCH http://localhost:4000/admin/users/:id/kyc/force` - Forcer le niveau KYC

   **Transactions (admin) :**
   - `GET http://localhost:4000/transactions` - Liste des transactions (avec filtres : ?source=, ?status=, ?partnerId=, ?page=, ?pageSize=)
   - `GET http://localhost:4000/transactions/export` - Export CSV des transactions
   - `POST http://localhost:4000/transactions/:id/flag` - Signaler une transaction

   **Cartes cadeaux (admin) :**
   - `GET http://localhost:4000/gift-cards/orders` - Liste des commandes
   - `GET http://localhost:4000/gift-cards/config` - Configuration actuelle
   - `PATCH http://localhost:4000/gift-cards/config` - Mettre à jour la configuration (multipart/form-data)
   - `GET http://localhost:4000/gift-cards/export` - Export CSV des commandes
   - `GET http://localhost:4000/gift-cards/box-up/config` - Configuration Box UP
   - `POST http://localhost:4000/gift-cards/box-up/config` - Créer/mettre à jour Box UP (multipart/form-data)

   **Santé :**
   - `GET http://localhost:4000/health` - Vérifier que l'API est accessible

4. **Authentification :**
   - L'API utilise JWT (JSON Web Tokens)
   - Après login, stocker le token et l'envoyer dans le header : `Authorization: Bearer <token>`
   - Tous les endpoints admin nécessitent le rôle `admin` dans le token JWT
   - Format de réponse du login : `{ data: { user, token }, error: null }`

5. **Format des requêtes :**
   - **JSON** : `Content-Type: application/json` pour les données simples
   - **Fichiers** : `Content-Type: multipart/form-data` pour les uploads (partenaires, offres, récompenses)
   - **Réponses** : Format `{ data, error, meta }` où `data` contient les données, `error` est null en cas de succès

6. **Exemple de configuration dans le code :**
   ```typescript
   // config/api.ts ou similaire
   const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
   
   export const apiClient = axios.create({
     baseURL: API_BASE_URL,
     headers: {
       'Content-Type': 'application/json'
     }
   });
   
   // Ajouter le token JWT aux requêtes
   apiClient.interceptors.request.use((config) => {
     const token = localStorage.getItem('authToken'); // ou votre système de stockage
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   });
   
   // Gérer les erreurs
   apiClient.interceptors.response.use(
     (response) => response.data, // Retourner directement data
     (error) => {
       if (error.response?.status === 401) {
         // Rediriger vers login si non authentifié
         window.location.href = '/login';
       }
       throw error;
     }
   );
   ```

7. **Exemple de requête pour créer un partenaire :**
   ```typescript
   const formData = new FormData();
   formData.append('name', 'Mon Partenaire');
   formData.append('categoryId', 'cat123');
   formData.append('tauxCashbackBase', '5');
   formData.append('territory', 'Martinique');
   formData.append('marketingPrograms', JSON.stringify(['pepites', 'boosted']));
   if (logoFile) formData.append('logo', logoFile);
   
   const response = await apiClient.post('/partners', formData, {
     headers: { 'Content-Type': 'multipart/form-data' }
   });
   ```

8. **Test de connexion :**
   ```typescript
   // Tester que l'API est accessible
   const healthCheck = await fetch('http://localhost:4000/health');
   const health = await healthCheck.json();
   // Doit retourner : { data: { status: 'ok', env: 'development' }, error: null }
   ```

9. **Test de synchronisation complète :**
   Pour vérifier que tout fonctionne :
   1. Créer un partenaire dans le back office via `POST /partners`
   2. Vérifier dans les logs de l'API (kashup-api) que la requête est reçue
   3. Vérifier que le webhook est envoyé à l'app mobile (si `MOBILE_WEBHOOK_URL` est configuré dans kashup-api)
   4. Vérifier dans l'app mobile que les données sont mises à jour en temps réel

**Points importants :**
- L'API écoute sur le port **4000** par défaut
- Les routes ne sont **PAS** préfixées par `/api` (directement `/partners`, `/auth`, etc.)
- Tous les endpoints admin nécessitent l'authentification JWT avec le rôle `admin`
- Les uploads de fichiers utilisent `multipart/form-data`
- Les réponses suivent toujours le format `{ data, error, meta }`

Configure l'URL de l'API dans kashup-admin pour qu'elle pointe vers `http://localhost:4000` (ou l'URL de production) et assure-toi que toutes les requêtes utilisent cette base URL avec les endpoints exacts listés ci-dessus.
```

