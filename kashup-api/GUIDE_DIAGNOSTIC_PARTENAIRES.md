# Guide de Diagnostic - Partenaires ne s'affichent pas

## Problème

Les partenaires ne remontent ni dans la page d'accueil ni dans l'onglet partenaire.

## Étapes de Diagnostic

### 1. Vérifier que l'API retourne des données

**Test 1 : Endpoint de debug (données brutes)**
```powershell
curl.exe http://localhost:4000/api/v1/partners/debug
```

**Résultat attendu :**
```json
{
  "debug": true,
  "totalInDb": 5,
  "sampleCount": 5,
  "samplePartners": [...]
}
```

**Si `totalInDb: 0`** → Aucun partenaire en base de données. Vérifier avec Prisma Studio.

**Si `totalInDb > 0` mais `sampleCount: 0`** → Problème de requête Prisma.

---

**Test 2 : Endpoint normal (avec sérialisation)**
```powershell
curl.exe http://localhost:4000/api/v1/partners
```

**Résultat attendu :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Liste des partenaires récupérée avec succès",
  "data": {
    "partners": [...]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

**Vérifier :**
- ✅ `statusCode: 200`
- ✅ `success: true`
- ✅ `data.partners` existe et est un array
- ✅ `data.partners.length > 0`

---

### 2. Vérifier les logs serveur

Lors d'une requête `GET /api/v1/partners`, vous devriez voir dans les logs :

```
📥 GET /api/v1/partners - Requête reçue
🔍 GET /partners - Filtres validés
🔍 GET /partners - Appel à listPartners
[listPartners] Données récupérées depuis Prisma
[listPartners] Partenaires formatés
✅ GET /partners - X partenaires retournés en Xms
🔍 Partenaires sérialisés avant envoi
🔍 Structure de réponse finale
```

**Si vous voyez :**
- `⚠️ GET /partners - Aucun partenaire retourné` → Vérifier les filtres et la base de données
- `❌ GET /partners - result.data n'est pas un array` → Problème dans `listPartners`
- `❌ GET /partners - serializedPartners n'est pas un array` → Problème de sérialisation

---

### 3. Vérifier la base de données

```bash
npx prisma studio
```

Vérifier :
- ✅ Des partenaires existent dans la table `Partner`
- ✅ Les partenaires ont un `categoryId` valide
- ✅ Les partenaires ont un `status` (peut être `null`, `'active'`, `'inactive'`, `'pending'`)

**Note :** L'API ne filtre PAS par `status` actuellement. Tous les partenaires devraient être retournés.

---

### 4. Vérifier la structure de réponse côté mobile

Le mobile doit accéder aux données ainsi :

```typescript
// ✅ CORRECT
const response = await fetch(`${BASE_URL}/partners`);
const json = await response.json();

if (json.success && json.data?.partners) {
  const partners = json.data.partners; // Array
  console.log('Partenaires reçus:', partners.length);
  setPartners(partners);
} else {
  console.error('Structure invalide:', json);
}
```

**Erreurs courantes :**
```typescript
// ❌ INCORRECT
const partners = json.data; // C'est { partners: [...] }, pas un array
const partners = json.partners; // N'existe pas
const partners = json.data?.data?.partners; // Trop profond
```

---

### 5. Vérifier les filtres appliqués

Si le mobile envoie des filtres qui excluent tous les partenaires :

```typescript
// Exemple de requête avec filtres
const response = await fetch(
  `${BASE_URL}/partners?category=inexistante&territory=inexistant`
);
```

**Solution :** Tester sans filtres d'abord :
```typescript
const response = await fetch(`${BASE_URL}/partners`);
```

---

### 6. Vérifier les timeouts

Si "ça tourne et rien ne remonte" :

**Côté serveur :**
- Vérifier que l'API répond (test avec curl)
- Vérifier les logs serveur pour voir si la requête arrive
- Vérifier les timeouts Prisma (3s)

**Côté mobile :**
- Vérifier le timeout client (30s)
- Vérifier les erreurs réseau dans les logs

---

## Solutions par Scénario

### Scénario 1 : `totalInDb: 0`

**Problème :** Aucun partenaire en base de données.

**Solution :**
1. Créer des partenaires via Prisma Studio ou l'API
2. Vérifier que les partenaires sont bien créés

---

### Scénario 2 : `totalInDb > 0` mais `data.partners.length === 0`

**Problème :** Les partenaires existent mais ne sont pas retournés.

**Causes possibles :**
1. Filtres qui excluent tous les partenaires
2. Problème de sérialisation qui retourne des `null`
3. Problème de formatage

**Solution :**
1. Tester sans filtres : `GET /api/v1/partners` (sans query params)
2. Vérifier les logs `[listPartners]` pour voir combien de partenaires sont récupérés
3. Vérifier les logs `🔍 Partenaires sérialisés` pour voir combien après sérialisation

---

### Scénario 3 : `data.partners.length > 0` mais le mobile ne les affiche pas

**Problème :** Les données sont retournées mais le mobile ne les affiche pas.

**Causes possibles :**
1. Structure de réponse incorrecte côté mobile
2. Données mélangées entre endpoints
3. Problème de state management
4. Erreurs JavaScript qui bloquent le rendu

**Solution :**
1. Vérifier les logs mobile pour voir ce qui est reçu
2. Vérifier que `json.data.partners` est bien utilisé (pas `json.data`)
3. Vérifier les erreurs JavaScript dans la console
4. Vérifier que les données ne sont pas écrasées par un autre endpoint

---

### Scénario 4 : Timeout ou "ça tourne"

**Problème :** La requête ne se termine jamais.

**Causes possibles :**
1. L'API ne répond pas
2. Problème réseau
3. Requête Prisma qui prend trop de temps

**Solution :**
1. Tester avec curl pour voir si l'API répond
2. Vérifier les logs serveur pour voir si la requête arrive
3. Vérifier les timeouts (25s serveur, 30s client)
4. Tester l'endpoint `/debug` qui est plus simple

---

## Commandes de Test Rapides

### Test 1 : Debug (données brutes)
```powershell
curl.exe http://localhost:4000/api/v1/partners/debug
```

### Test 2 : Endpoint normal
```powershell
curl.exe http://localhost:4000/api/v1/partners
```

### Test 3 : Avec pagination
```powershell
curl.exe "http://localhost:4000/api/v1/partners?page=1&pageSize=10"
```

### Test 4 : Health check
```powershell
curl.exe http://localhost:4000/health
```

### Test 5 : Network info
```powershell
curl.exe http://localhost:4000/api/v1/debug/network
```

---

## Checklist Complète

- [ ] L'API est démarrée (`npm run dev`)
- [ ] L'API répond à `/health` (200 OK)
- [ ] `/api/v1/partners/debug` retourne `totalInDb > 0`
- [ ] `/api/v1/partners` retourne `data.partners.length > 0`
- [ ] Les logs serveur montrent les partenaires récupérés
- [ ] Le mobile accède à `json.data.partners` (pas `json.data`)
- [ ] Pas d'erreurs JavaScript dans la console mobile
- [ ] Pas de timeouts (requête se termine en < 30s)
- [ ] Les données ne sont pas mélangées avec d'autres endpoints

---

## Logs à Fournir en Cas de Problème

Si le problème persiste, fournir :

1. **Logs serveur complets** lors d'une requête `GET /api/v1/partners`
2. **Résultat de** `curl http://localhost:4000/api/v1/partners/debug`
3. **Résultat de** `curl http://localhost:4000/api/v1/partners`
4. **Logs mobile** lors de la récupération des partenaires
5. **Code mobile** qui consomme l'API (la fonction qui fait le fetch)

---

## Endpoints de Debug Disponibles

- `GET /api/v1/partners/debug` → Données brutes depuis Prisma (sans filtres, sans sérialisation)
- `GET /api/v1/partners/test` → Structure de réponse attendue
- `GET /api/v1/debug/network` → Informations réseau (IP LAN, port, etc.)

