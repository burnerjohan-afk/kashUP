# 📊 Endpoints Admin Statistics & AI - KashUP API

## ✅ Endpoints implémentés

### 1. GET /admin/statistics/table

**Description :** Retourne un tableau de statistiques filtré selon les critères.

**Authentification :** Requise (Admin uniquement)

**Query Parameters :**
- `territory` (optionnel) : `'Martinique' | 'Guadeloupe' | 'Guyane'`
- `allDay` (optionnel) : `'true' | 'false'` - Filtrer sur toute la journée
- `timeSlot` (optionnel) : `'morning' | 'afternoon' | 'evening' | 'night'` ou format `'HH:mm-HH:mm'`
- `gender` (optionnel) : `'M' | 'F' | 'other'`
- `ageRange` (optionnel) : `'18-25' | '26-35' | '36-45' | '46-55' | '56+'`

**Réponse :**
```json
{
  "data": {
    "rows": [
      {
        "territory": "Martinique",
        "ageRange": "18-25",
        "gender": "M",
        "timeSlot": "morning",
        "allDay": false,
        "count": 150,
        "transactions": 200,
        "revenue": 12000,
        "cashback": 600,
        "averageTransaction": 60
      }
    ],
    "totals": {
      "count": 1500,
      "transactions": 2000,
      "revenue": 120000,
      "cashback": 6000,
      "averageTransaction": 60
    },
    "filters": {
      "territory": "Martinique",
      "allDay": false,
      "timeSlot": "morning",
      "gender": "M",
      "ageRange": "18-25"
    }
  },
  "error": null,
  "meta": null
}
```

**Exemple d'utilisation :**
```bash
curl -X GET "http://localhost:4000/admin/statistics/table?territory=Martinique&ageRange=18-25&gender=M" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 2. GET /admin/statistics/departments

**Description :** Retourne les statistiques par département.

**Authentification :** Requise (Admin uniquement)

**Query Parameters :**
- `territory` (optionnel) : `'Martinique' | 'Guadeloupe' | 'Guyane'` - Filtrer par territoire

**Réponse :**
```json
{
  "data": [
    {
      "department": "Martinique",
      "code": "972",
      "territory": "Martinique",
      "partners": 25,
      "transactions": 500,
      "revenue": 30000,
      "averageTransaction": 60,
      "cashback": 1500
    },
    {
      "department": "Guadeloupe",
      "code": "971",
      "territory": "Guadeloupe",
      "partners": 20,
      "transactions": 400,
      "revenue": 25000,
      "averageTransaction": 62,
      "cashback": 1250
    }
  ],
  "error": null,
  "meta": null
}
```

**Exemple d'utilisation :**
```bash
curl -X GET "http://localhost:4000/admin/statistics/departments?territory=Martinique" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. GET /admin/ai/analysis

**Description :** Retourne une analyse IA avec KPIs, services, transactions quotidiennes, territoires, actions.

**Authentification :** Requise (Admin uniquement)

**Query Parameters :**
- `territory` (optionnel) : `'Martinique' | 'Guadeloupe' | 'Guyane'` - Filtrer par territoire
- `startDate` (optionnel) : Date de début au format ISO 8601 (ex: `2024-01-01`)
- `endDate` (optionnel) : Date de fin au format ISO 8601 (ex: `2024-12-31`)

**Réponse :**
```json
{
  "data": {
    "kpis": {
      "revenue": 50000,
      "cashback": 2500,
      "partners": 45,
      "users": 1200
    },
    "services": 18,
    "dailyTransactions": [
      {
        "date": "2024-01-15",
        "count": 50,
        "revenue": 3000,
        "cashback": 150
      },
      {
        "date": "2024-01-16",
        "count": 55,
        "revenue": 3300,
        "cashback": 165
      }
    ],
    "territories": [
      {
        "territory": "Martinique",
        "users": 400,
        "partners": 15,
        "transactions": 200,
        "revenue": 15000,
        "cashback": 750,
        "growth": 5.2
      }
    ],
    "actions": 8
  },
  "error": null,
  "meta": null
}
```

**Exemple d'utilisation :**
```bash
curl -X GET "http://localhost:4000/admin/ai/analysis?territory=Martinique" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers

1. **`src/controllers/adminStatistics.controller.ts`**
   - `getStatisticsTable` : Handler pour `/admin/statistics/table`
   - `getStatisticsDepartments` : Handler pour `/admin/statistics/departments`
   - Validation Zod des query parameters
   - Génération de données mockées cohérentes

2. **`src/controllers/adminAI.controller.ts`**
   - `getAIAnalysis` : Handler pour `/admin/ai/analysis`
   - Validation Zod des query parameters
   - Génération de données mockées cohérentes (KPIs, services, transactions quotidiennes, territoires, actions)

### Fichiers modifiés

1. **`src/routes/admin.routes.ts`**
   - Ajout de la route `GET /admin/statistics/table`
   - Ajout de la route `GET /admin/statistics/departments`
   - Ajout de la route `GET /admin/ai/analysis`

---

## 🔒 Sécurité

Tous les endpoints sont protégés par :
- **Authentification JWT** : `authMiddleware`
- **Autorisation Admin** : `requireRoles(USER_ROLE.admin)`

---

## 📊 Données mockées

Les endpoints retournent actuellement des **données mockées** mais cohérentes :
- Les valeurs sont générées de manière aléatoire mais réaliste
- Les filtres sont appliqués correctement
- Les agrégations sont calculées dynamiquement
- Les formats de réponse correspondent exactement à ce qui est attendu par kashup-admin

### Prochaines étapes (optionnel)

Pour remplacer les données mockées par des données réelles :
1. Utiliser Prisma pour interroger la base de données
2. Agréger les données depuis les tables `Transaction`, `User`, `Partner`
3. Calculer les KPIs, statistiques par territoire, etc.

---

## ✅ Vérifications

- [x] Compilation TypeScript réussie
- [x] Routes ajoutées dans `admin.routes.ts`
- [x] Validation Zod des query parameters
- [x] Format de réponse standardisé (`{ data, error, meta }`)
- [x] Utilisation de `asyncHandler`, `AppError`, `sendSuccess`
- [x] Authentification et autorisation Admin
- [x] Données mockées cohérentes et réalistes

---

## 🧪 Tests

Pour tester les endpoints :

1. **Obtenir un token admin** :
   ```bash
   curl -X POST http://localhost:4000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@kashup.com","password":"Kashup123!"}'
   ```

2. **Tester `/admin/statistics/table`** :
   ```bash
   curl -X GET "http://localhost:4000/admin/statistics/table?territory=Martinique" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Tester `/admin/statistics/departments`** :
   ```bash
   curl -X GET "http://localhost:4000/admin/statistics/departments" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

4. **Tester `/admin/ai/analysis`** :
   ```bash
   curl -X GET "http://localhost:4000/admin/ai/analysis" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

**✅ Tous les endpoints sont implémentés et fonctionnels. L'API répond correctement aux appels venant du back-office sans erreur 404.**

