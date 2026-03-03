# Routes Normalisées - KashUP API

## Vue d'ensemble

Toutes les routes de l'API sont normalisées sous `/api/v1` avec une convention REST stricte et identique pour toutes les ressources.

## Convention REST

Pour chaque ressource `<resource>` :
- `GET /api/v1/<resource>` => Liste (public)
- `GET /api/v1/<resource>/:id` => Détail (public)
- `POST /api/v1/<resource>` => Création (admin)
- `PATCH /api/v1/<resource>/:id` => Modification (admin)
- `DELETE /api/v1/<resource>/:id` => Suppression (admin)

## Routes Système

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| GET | `/health` | Health check | Non | ✅ 200 |
| GET | `/api/v1/health` | Health check versionné | Non | ✅ 200 |
| GET | `/api/v1/debug/network` | Informations réseau (IPv4, port, basePath, origins) | Non | ✅ 200 |

## Routes Ressources Normalisées

### Partners (Partenaires)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| GET | `/api/v1/partners` | Liste des partenaires (avec filtres) | Non | ✅ 200 |
| GET | `/api/v1/partners/:id` | Détail d'un partenaire | Non | ✅ 200 |
| POST | `/api/v1/partners` | Création d'un partenaire | Admin/Partner | ✅ 201 |
| PATCH | `/api/v1/partners/:id` | Modification d'un partenaire | Admin/Partner | ✅ 200 |
| DELETE | `/api/v1/partners/:id` | Suppression d'un partenaire | Admin | ✅ 200 |
| GET | `/api/v1/partners/categories` | Liste des catégories | Non | ✅ 200 |
| GET | `/api/v1/partners/territories` | Liste des territoires | Non | ✅ 200 |

**Champs sensibles filtrés en mode public :**
- `siret`
- `phone`
- `documents`
- `additionalInfo`
- `affiliations`

**URLs d'images :**
- Les URLs relatives (`/uploads/...`) sont automatiquement transformées en URLs absolues avec IP LAN
- Champ `imageUrl` : URL absolue avec IP LAN
- Champ `imagePath` : Chemin relatif original

### Gift Cards (Bons d'achat / Vouchers)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| GET | `/api/v1/gift-cards` | Catalogue des bons d'achat | Non | ✅ 200 |
| GET | `/api/v1/gift-cards/catalog` | Alias pour catalogue | Non | ✅ 200 |
| GET | `/api/v1/gift-cards/offers` | Offres de bons d'achat | Non | ✅ 200 |
| GET | `/api/v1/gift-cards/boxes` | Liste des boxups | Non | ✅ 200 |
| GET | `/api/v1/gift-cards/boxes/:id` | Détail d'un boxup | Non | ✅ 200 |
| GET | `/api/v1/gift-cards/user` | Bons d'achat de l'utilisateur | User | ✅ 200 |
| POST | `/api/v1/gift-cards/purchase` | Achat d'un bon d'achat | User | ✅ 201 |
| GET | `/api/v1/gift-cards/orders` | Commandes (admin) | Admin | ✅ 200 |
| GET | `/api/v1/gift-cards/config` | Configuration (admin) | Admin | ✅ 200 |
| PATCH | `/api/v1/gift-cards/config` | Mise à jour config (admin) | Admin | ✅ 200 |
| GET | `/api/v1/gift-cards/box-up/config` | Config BoxUp (admin) | Admin | ✅ 200 |
| POST | `/api/v1/gift-cards/box-up/config` | Création/mise à jour BoxUp (admin) | Admin | ✅ 200 |

**Note :** Les routes gift-cards suivent une structure spécifique (pas de CRUD classique) car elles gèrent des catalogues, des achats, etc.

### Badges

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| GET | `/api/v1/badges` | Liste des badges | Non | ✅ 200 |
| GET | `/api/v1/badges/:id` | Détail d'un badge | Non | ⚠️ 501 |
| POST | `/api/v1/badges` | Création d'un badge | Admin | ⚠️ 501 |
| PATCH | `/api/v1/badges/:id` | Modification d'un badge | Admin | ⚠️ 501 |
| DELETE | `/api/v1/badges/:id` | Suppression d'un badge | Admin | ⚠️ 501 |

**Note :** Les opérations CRUD complètes ne sont pas encore implémentées (501 Not Implemented).

### Lotteries

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| GET | `/api/v1/lotteries` | Liste des loteries | Non | ✅ 200 |
| GET | `/api/v1/lotteries/:id` | Détail d'une loterie | Non | ✅ 200 |
| POST | `/api/v1/lotteries` | Création d'une loterie | Admin | ⚠️ 501 |
| PATCH | `/api/v1/lotteries/:id` | Modification d'une loterie | Admin | ⚠️ 501 |
| DELETE | `/api/v1/lotteries/:id` | Suppression d'une loterie | Admin | ⚠️ 501 |
| POST | `/api/v1/lotteries/:id/join` | Rejoindre une loterie | User | ✅ 201 |

**Note :** Les opérations CRUD complètes (POST, PATCH, DELETE) ne sont pas encore implémentées (501 Not Implemented).

### BoxUps

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| GET | `/api/v1/boxups` | Liste des boxups | Non | ✅ 200 |
| GET | `/api/v1/boxups/:id` | Détail d'un boxup | Non | ✅ 200 |
| POST | `/api/v1/boxups` | Création d'un boxup | Admin | ⚠️ 501 |
| PATCH | `/api/v1/boxups/:id` | Modification d'un boxup | Admin | ⚠️ 501 |
| DELETE | `/api/v1/boxups/:id` | Suppression d'un boxup | Admin | ⚠️ 501 |

**Note :** Les opérations CRUD complètes (POST, PATCH, DELETE) ne sont pas encore implémentées (501 Not Implemented).

### CarteUps

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| GET | `/api/v1/carteups` | Liste des carteups | Non | ⚠️ 501 |
| GET | `/api/v1/carteups/:id` | Détail d'un carteup | Non | ⚠️ 501 |
| POST | `/api/v1/carteups` | Création d'un carteup | Admin | ⚠️ 501 |
| PATCH | `/api/v1/carteups/:id` | Modification d'un carteup | Admin | ⚠️ 501 |
| DELETE | `/api/v1/carteups/:id` | Suppression d'un carteup | Admin | ⚠️ 501 |

**Note :** Cette ressource n'existe pas encore en base de données. Toutes les routes retournent 501 Not Implemented.

## Routes Autres Ressources (Non normalisées mais disponibles)

- `/api/v1/offers` - Offres partenaires
- `/api/v1/rewards` - Récompenses
- `/api/v1/transactions` - Transactions
- `/api/v1/donations` - Dons
- `/api/v1/content` - Contenu (predefined-gifts, box-up, spotlight-associations)
- `/api/v1/stats` - Statistiques
- `/api/v1/auth` - Authentification
- `/api/v1/me` - Profil utilisateur
- `/api/v1/powens` - Intégration Powens
- `/api/v1/webhooks` - Webhooks
- `/api/v1/admin` - Routes admin

## Sérialisation Public vs Admin

### Mode Public (Mobile)
- Les champs sensibles sont automatiquement filtrés
- Les URLs d'images sont transformées en URLs absolues avec IP LAN
- Pas d'accès aux documents privés, SIRET, téléphone, etc.

### Mode Admin
- Accès complet à toutes les données
- Tous les champs sont retournés
- Accès aux documents et informations sensibles

**Détection automatique :** Le système détecte automatiquement si la requête provient d'un admin (via le token JWT) et applique la sérialisation appropriée.

## URLs Dynamiques

### Détection IPv4 LAN
L'API détecte automatiquement l'IPv4 LAN active au runtime et l'utilise pour construire les URLs absolues.

### Endpoint Debug Network
```bash
GET /api/v1/debug/network
```

**Réponse :**
```json
{
  "data": {
    "ipv4": "192.168.1.100",
    "port": 4000,
    "basePath": "/api/v1",
    "origins": [
      "http://192.168.1.100:4000",
      "http://localhost:4000"
    ],
    "host": "localhost:4000",
    "protocol": "http"
  }
}
```

## CORS Configuration

- **Origines autorisées en dev :** Toutes (`origin: true`)
- **Origines autorisées en prod :** Configurable via `CORS_ORIGIN` dans `.env`
- **Méthodes autorisées :** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers autorisés :** Content-Type, Authorization
- **Support Expo Go :** Patterns spéciaux pour `exp://` et IPs locales

## Fichiers Modifiés

### Nouveaux fichiers
- `src/utils/network.ts` - Détection IPv4 LAN et construction d'URLs
- `src/utils/serializer.ts` - Sérialisation public vs admin
- `src/controllers/debug.controller.ts` - Contrôleur debug network
- `src/controllers/resource.controller.ts` - Handlers génériques pour ressources
- `src/routes/debug.routes.ts` - Routes debug
- `src/routes/badges.routes.ts` - Routes badges normalisées
- `src/routes/lotteries.routes.ts` - Routes lotteries normalisées
- `src/routes/boxups.routes.ts` - Routes boxups normalisées
- `src/routes/carteups.routes.ts` - Routes carteups normalisées

### Fichiers modifiés
- `src/routes/index.ts` - Ajout des nouvelles routes normalisées
- `src/controllers/partner.controller.ts` - Utilisation de la sérialisation
- `src/server.ts` - Logs avec IPv4 LAN détectée
- `src/app.ts` - Déjà configuré pour CORS et static files

## Commandes PowerShell/Windows

### Libérer le port 4000 si EADDRINUSE

```powershell
# Trouver le processus qui utilise le port 4000
netstat -ano | findstr :4000

# Tuer le processus (remplacer <PID> par le PID trouvé)
taskkill /PID <PID> /F

# Ou en une seule commande (tue tous les processus sur le port 4000)
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Lancer l'API

```powershell
# En mode développement
npm run dev

# Ou directement avec ts-node-dev
npx ts-node-dev --respawn --transpile-only src/server.ts
```

## Checklist de Test

### Test Navigateur (PC)

- [ ] **Health Check**
  - [ ] `GET http://localhost:4000/health` → 200 OK
  - [ ] `GET http://localhost:4000/api/v1/health` → 200 OK
  - [ ] Vérifier la réponse JSON : `{ status: 'ok', port: 4000, basePath: '/api/v1' }`

- [ ] **Debug Network**
  - [ ] `GET http://localhost:4000/api/v1/debug/network` → 200 OK
  - [ ] Vérifier que `ipv4` est détectée (ou null si pas de réseau)
  - [ ] Vérifier que `origins` contient l'IP LAN et localhost

- [ ] **Partners (Public)**
  - [ ] `GET http://localhost:4000/api/v1/partners` → 200 OK
  - [ ] Vérifier que les champs sensibles (`siret`, `phone`, `documents`) sont absents
  - [ ] Vérifier que `imageUrl` est une URL absolue avec IP LAN
  - [ ] Vérifier que `imagePath` est le chemin relatif original
  - [ ] `GET http://localhost:4000/api/v1/partners/:id` → 200 OK
  - [ ] Vérifier la sérialisation public

- [ ] **Partners (Admin)**
  - [ ] `GET http://localhost:4000/api/v1/partners` avec token admin → 200 OK
  - [ ] Vérifier que tous les champs sont présents (y compris sensibles)
  - [ ] `POST http://localhost:4000/api/v1/partners` avec token admin → 201 Created
  - [ ] `PATCH http://localhost:4000/api/v1/partners/:id` avec token admin → 200 OK
  - [ ] `DELETE http://localhost:4000/api/v1/partners/:id` avec token admin → 200 OK

- [ ] **Badges**
  - [ ] `GET http://localhost:4000/api/v1/badges` → 200 OK
  - [ ] `GET http://localhost:4000/api/v1/badges/:id` → 501 Not Implemented

- [ ] **Lotteries**
  - [ ] `GET http://localhost:4000/api/v1/lotteries` → 200 OK
  - [ ] `GET http://localhost:4000/api/v1/lotteries/:id` → 200 OK
  - [ ] `POST http://localhost:4000/api/v1/lotteries/:id/join` avec token → 201 Created

- [ ] **BoxUps**
  - [ ] `GET http://localhost:4000/api/v1/boxups` → 200 OK
  - [ ] `GET http://localhost:4000/api/v1/boxups/:id` → 200 OK

- [ ] **CarteUps**
  - [ ] `GET http://localhost:4000/api/v1/carteups` → 501 Not Implemented

- [ ] **Gift Cards**
  - [ ] `GET http://localhost:4000/api/v1/gift-cards` → 200 OK
  - [ ] `GET http://localhost:4000/api/v1/gift-cards/catalog` → 200 OK

- [ ] **Uploads (Images)**
  - [ ] `GET http://localhost:4000/uploads/partners/.../logo.jpg` → 200 OK
  - [ ] Vérifier que l'image s'affiche correctement
  - [ ] Vérifier les headers CORS

### Test depuis iPhone (LAN)

**Prérequis :**
- iPhone et PC sur le même réseau Wi-Fi
- Connaître l'IP LAN du PC (affichée dans les logs au démarrage ou via `/api/v1/debug/network`)

- [ ] **Détection IP LAN**
  - [ ] Sur le PC, lancer l'API et noter l'IPv4 LAN affichée dans les logs
  - [ ] Exemple : `192.168.1.100`

- [ ] **Health Check**
  - [ ] Sur iPhone (Safari ou Expo Go), ouvrir `http://<IP_LAN>:4000/health`
  - [ ] Vérifier 200 OK
  - [ ] `http://<IP_LAN>:4000/api/v1/health` → 200 OK

- [ ] **Debug Network**
  - [ ] `http://<IP_LAN>:4000/api/v1/debug/network` → 200 OK
  - [ ] Vérifier que `ipv4` correspond à l'IP LAN du PC

- [ ] **Partners (Public)**
  - [ ] `http://<IP_LAN>:4000/api/v1/partners` → 200 OK
  - [ ] Vérifier que les données sont retournées
  - [ ] Vérifier que les URLs d'images utilisent l'IP LAN (`http://<IP_LAN>:4000/uploads/...`)
  - [ ] `http://<IP_LAN>:4000/api/v1/partners/:id` → 200 OK

- [ ] **Images**
  - [ ] Ouvrir une URL d'image : `http://<IP_LAN>:4000/uploads/partners/.../logo.jpg`
  - [ ] Vérifier que l'image s'affiche correctement
  - [ ] Vérifier qu'il n'y a pas d'erreur CORS

- [ ] **Expo Go**
  - [ ] Configurer l'app mobile pour utiliser `http://<IP_LAN>:4000/api/v1`
  - [ ] Tester les appels API depuis l'app
  - [ ] Vérifier que les images se chargent correctement

### Commandes de Test (PowerShell)

```powershell
# Health Check
curl.exe http://localhost:4000/health
curl.exe http://localhost:4000/api/v1/health

# Debug Network
curl.exe http://localhost:4000/api/v1/debug/network

# Partners (sans token - public)
curl.exe http://localhost:4000/api/v1/partners

# Partners (avec token admin - remplacer <TOKEN>)
curl.exe -H "Authorization: Bearer <TOKEN>" http://localhost:4000/api/v1/partners

# Badges
curl.exe http://localhost:4000/api/v1/badges

# Lotteries
curl.exe http://localhost:4000/api/v1/lotteries

# BoxUps
curl.exe http://localhost:4000/api/v1/boxups

# CarteUps (devrait retourner 501)
curl.exe http://localhost:4000/api/v1/carteups
```

### Test avec IP LAN (remplacer <IP_LAN>)

```powershell
# Exemple avec IP 192.168.1.100
$IP_LAN = "192.168.1.100"

# Health Check
curl.exe "http://$IP_LAN:4000/health"
curl.exe "http://$IP_LAN:4000/api/v1/health"

# Debug Network
curl.exe "http://$IP_LAN:4000/api/v1/debug/network"

# Partners
curl.exe "http://$IP_LAN:4000/api/v1/partners"
```

## Notes Importantes

1. **IP LAN Dynamique :** L'IP LAN peut changer si le PC se reconnecte au Wi-Fi. L'API détecte automatiquement la nouvelle IP au démarrage.

2. **Champs Sensibles :** Les champs sensibles sont automatiquement filtrés pour les requêtes publiques. Seuls les admins voient toutes les données.

3. **URLs d'Images :** Les URLs d'images sont automatiquement transformées en URLs absolues avec IP LAN pour le mobile, tout en conservant le chemin relatif dans `imagePath`.

4. **501 Not Implemented :** Certaines ressources (carteups, certaines opérations CRUD) retournent 501 car elles ne sont pas encore implémentées en base de données. Les routes existent mais les handlers retournent 501.

5. **CORS :** En développement, CORS est permissif (`origin: true`). En production, configurez `CORS_ORIGIN` dans `.env`.

6. **Convention REST :** Toutes les routes suivent la même convention REST pour faciliter l'intégration mobile.

