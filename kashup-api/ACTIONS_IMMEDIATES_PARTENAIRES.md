# Actions Immédiates - Partenaires ne s'affichent pas

## 🔍 Diagnostic Rapide

### Étape 1 : Vérifier que l'API retourne des données

**Commande PowerShell :**
```powershell
# Test 1 : Debug (données brutes depuis Prisma)
curl.exe http://localhost:4000/api/v1/partners/debug

# Test 2 : Endpoint normal (avec sérialisation)
curl.exe http://localhost:4000/api/v1/partners

# Test 3 : Health check
curl.exe http://localhost:4000/health
```

**Résultats attendus :**

**Test 1 (`/debug`) :**
```json
{
  "debug": true,
  "totalInDb": 5,  // ← Doit être > 0
  "sampleCount": 5,
  "samplePartners": [...]
}
```

**Si `totalInDb: 0`** → **PROBLÈME : Aucun partenaire en base de données**
- Solution : Créer des partenaires via Prisma Studio ou l'API

**Test 2 (`/partners`) :**
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "partners": [...]  // ← Doit contenir un array
  }
}
```

**Si `data.partners.length === 0`** → Voir Scénario 2 ci-dessous

---

### Étape 2 : Vérifier les logs serveur

Lors d'une requête, vous devriez voir dans les logs :

```
📥 GET /api/v1/partners - Requête reçue
🔍 GET /partners - Filtres validés
[listPartners] Données récupérées depuis Prisma
[listPartners] Partenaires formatés
✅ GET /partners - X partenaires retournés
🔍 Partenaires sérialisés avant envoi
🔍 Structure de réponse finale
```

**Si vous voyez :**
- `⚠️ GET /partners - Aucun partenaire retourné` → Vérifier les filtres
- `❌ GET /partners - result.data n'est pas un array` → Problème dans listPartners
- `❌ GET /partners - serializedPartners n'est pas un array` → Problème de sérialisation

---

## 🎯 Scénarios et Solutions

### Scénario A : `totalInDb: 0` (Aucun partenaire en DB)

**Diagnostic :**
```powershell
curl.exe http://localhost:4000/api/v1/partners/debug
# Retourne : "totalInDb": 0
```

**Solution :**
1. Ouvrir Prisma Studio : `npx prisma studio`
2. Vérifier la table `Partner`
3. Si vide, créer des partenaires via l'API ou Prisma Studio

---

### Scénario B : `totalInDb > 0` mais `data.partners.length === 0`

**Diagnostic :**
```powershell
curl.exe http://localhost:4000/api/v1/partners/debug
# Retourne : "totalInDb": 5

curl.exe http://localhost:4000/api/v1/partners
# Retourne : "data": { "partners": [] }
```

**Causes possibles :**
1. Filtres qui excluent tous les partenaires
2. Problème de sérialisation (retourne des `null`)
3. Problème de formatage

**Solution :**
1. Tester sans filtres : `curl.exe http://localhost:4000/api/v1/partners` (sans query params)
2. Vérifier les logs `[listPartners]` pour voir combien sont récupérés
3. Vérifier les logs `🔍 Partenaires sérialisés` pour voir combien après sérialisation

---

### Scénario C : `data.partners.length > 0` mais le mobile ne les affiche pas

**Diagnostic :**
```powershell
curl.exe http://localhost:4000/api/v1/partners
# Retourne : "data": { "partners": [ {...}, {...} ] }  # ← Des données existent
```

**Causes possibles :**
1. Structure de réponse incorrecte côté mobile
2. Données mélangées entre endpoints
3. Problème de state management
4. Erreurs JavaScript qui bloquent le rendu

**Solution :**
1. Vérifier les logs mobile pour voir ce qui est reçu
2. Vérifier que le mobile accède à `json.data.partners` (pas `json.data`)
3. Vérifier les erreurs JavaScript dans la console mobile
4. Vérifier que les données ne sont pas écrasées par un autre endpoint

---

### Scénario D : Timeout ou "ça tourne"

**Diagnostic :**
- La requête ne se termine jamais
- Timeout après 30s

**Solution :**
1. Tester avec curl pour voir si l'API répond
2. Vérifier les logs serveur pour voir si la requête arrive
3. Vérifier les timeouts (25s serveur, 30s client)
4. Tester l'endpoint `/debug` qui est plus simple

---

## 📋 Checklist de Vérification

### Côté API
- [ ] L'API est démarrée (`npm run dev`)
- [ ] L'API répond à `/health` (200 OK)
- [ ] `/api/v1/partners/debug` retourne `totalInDb > 0`
- [ ] `/api/v1/partners` retourne `data.partners.length > 0`
- [ ] Les logs serveur montrent les partenaires récupérés
- [ ] Pas d'erreurs dans les logs serveur

### Côté Mobile
- [ ] Le mobile accède à `json.data.partners` (pas `json.data`)
- [ ] Pas d'erreurs JavaScript dans la console
- [ ] Pas de timeouts (requête se termine en < 30s)
- [ ] Les données ne sont pas mélangées avec d'autres endpoints
- [ ] Le state management ne cache pas les données

---

## 🔧 Commandes de Test

### Test Complet (PowerShell)

```powershell
# 1. Health check
Write-Host "=== Health Check ===" -ForegroundColor Cyan
curl.exe http://localhost:4000/health

# 2. Debug (données brutes)
Write-Host "`n=== Debug (données brutes) ===" -ForegroundColor Cyan
curl.exe http://localhost:4000/api/v1/partners/debug

# 3. Endpoint normal
Write-Host "`n=== Endpoint normal ===" -ForegroundColor Cyan
curl.exe http://localhost:4000/api/v1/partners

# 4. Avec pagination
Write-Host "`n=== Avec pagination ===" -ForegroundColor Cyan
curl.exe "http://localhost:4000/api/v1/partners?page=1&pageSize=10"

# 5. Network info
Write-Host "`n=== Network Info ===" -ForegroundColor Cyan
curl.exe http://localhost:4000/api/v1/debug/network
```

---

## 📊 Structure de Réponse Attendue

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Liste des partenaires récupérée avec succès",
  "data": {
    "partners": [
      {
        "id": "cmj8sdmge00014y78309dqsye",
        "name": "HITBOX",
        "slug": "hitbox",
        "category": {
          "id": "cmj8sdmge00014y78309dqsye",
          "name": "Loisir"
        },
        "categoryName": "Loisir",
        "logoUrl": "http://192.168.1.19:4000/uploads/partners/.../logo.jpg",
        "imageUrl": "http://192.168.1.19:4000/uploads/partners/.../logo.jpg",
        "imagePath": "/uploads/partners/.../logo.jpg",
        "territories": ["Guyane"],
        "tauxCashbackBase": 5.0,
        // ... autres champs
      }
    ]
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

**⚠️ IMPORTANT :** Le mobile doit accéder à `response.data.partners` (array), pas `response.data` (objet).

---

## 🚨 Actions Immédiates

1. **Tester l'endpoint `/debug`** pour voir si des partenaires existent en DB
2. **Tester l'endpoint `/partners`** pour voir la structure de réponse
3. **Vérifier les logs serveur** lors d'une requête depuis le mobile
4. **Vérifier côté mobile** que `json.data.partners` est bien utilisé
5. **Vérifier les erreurs** dans la console mobile

---

## 📝 Logs à Fournir

Si le problème persiste, fournir :

1. **Résultat de** `curl http://localhost:4000/api/v1/partners/debug`
2. **Résultat de** `curl http://localhost:4000/api/v1/partners`
3. **Logs serveur complets** lors d'une requête `GET /api/v1/partners`
4. **Logs mobile** lors de la récupération des partenaires
5. **Code mobile** qui consomme l'API (la fonction fetch)

---

**Référence complète :** `GUIDE_DIAGNOSTIC_PARTENAIRES.md`

