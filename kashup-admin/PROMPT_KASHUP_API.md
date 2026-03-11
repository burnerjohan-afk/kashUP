# Prompt pour kashup-api - Correction erreur 500 lors de la création d'un partenaire

---

Je dois corriger une erreur 500 (Internal Server Error) qui se produit lors de la création d'un partenaire depuis le frontend `kashup-admin`.

## 🚨 Problème actuel

L'endpoint `POST /partners` retourne systématiquement une erreur 500 avec le message "Erreur interne inattendue" sans aucun détail, ce qui rend le débogage impossible.

## 📋 Format exact des données reçues

Le frontend envoie une requête `multipart/form-data` avec les champs suivants :

### Champs obligatoires
- `name`: string (ex: `'SECURIDOM'`)
- `category`: string (ex: `'Services'`)
- `status`: string (ex: `'pending'`, `'active'`, `'inactive'`)

### Champs territoires (IMPORTANT)
- `territories`: **CHAÎNE JSON** (ex: `'["martinique"]'` ou `'["martinique", "guadeloupe"]'`)
  - ⚠️ **Ce n'est PAS un tableau, c'est une chaîne JSON stringifiée**
  - Il faut parser cette chaîne avec `JSON.parse()` pour obtenir un tableau
- `territory`: string (ex: `'martinique'`) - envoyé pour compatibilité avec l'ancien format

### Champs optionnels (tous envoyés comme chaînes)
- `siret`: string (ex: `'420 233 462 00027'`)
- `phone`: string (ex: `'+596 596766059'`)
- `discoveryCashbackRate`: string (ex: `'0'`, `'5'`)
- `permanentCashbackRate`: string (ex: `'0'`, `'10'`)
- `giftCardEnabled`: string (ex: `'false'`, `'true'`)
- `boostEnabled`: string (ex: `'false'`, `'true'`)
- `giftCardCashbackRate`: string (ex: `'0'`, `'5'`)
- `boostRate`: string (ex: `'0'`, `'15'`)
- `marketingPrograms`: **CHAÎNE JSON** (ex: `'["pepites", "boosted"]'`)
- `openingDays`: **CHAÎNE JSON** (ex: `'["monday", "tuesday"]'`)
- `address`: string
- `openingHoursStart`: string (ex: `'09:00'`)
- `openingHoursEnd`: string (ex: `'18:00'`)
- `instagramUrl`: string
- `facebookUrl`: string
- `logo`: File (fichier image)
- `kbis`: File (fichier PDF)
- `giftCardImage`: File
- `giftCardVirtualCardImage`: File
- `menuImages`: File[] (plusieurs fichiers)
- `photos`: File[] (plusieurs fichiers)

## 🔍 Exemple de requête complète

```
POST http://localhost:4000/partners
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
  name: "SECURIDOM"
  siret: "420 233 462 00027"
  phone: "+596 596766059"
  category: "Services"
  territories: '["martinique"]'  ← CHAÎNE JSON, pas un tableau !
  territory: "martinique"
  status: "pending"
  giftCardEnabled: "false"
  boostEnabled: "false"
  discoveryCashbackRate: "0"
  permanentCashbackRate: "0"
  ... (autres champs)
```

## 🎯 Ce que le backend doit faire

### 1. Parser les champs JSON stringifiés

```typescript
// ❌ MAUVAIS - Ne pas utiliser directement
const territories = req.body.territories; // Ce sera la chaîne '["martinique"]'

// ✅ BON - Parser la chaîne JSON
let territories: string[] = [];
if (req.body.territories) {
  try {
    territories = JSON.parse(req.body.territories);
  } catch (error) {
    // Gérer l'erreur de parsing
    return res.status(400).json({
      error: {
        message: "Format invalide pour territories",
        code: "INVALID_TERRITORIES_FORMAT",
        details: { received: req.body.territories }
      }
    });
  }
}
```

### 2. Convertir les chaînes en types appropriés

```typescript
// Convertir les booléens
const giftCardEnabled = req.body.giftCardEnabled === 'true' || req.body.giftCardEnabled === true;
const boostEnabled = req.body.boostEnabled === 'true' || req.body.boostEnabled === true;

// Convertir les nombres
const discoveryCashbackRate = req.body.discoveryCashbackRate 
  ? parseFloat(req.body.discoveryCashbackRate) 
  : undefined;
const permanentCashbackRate = req.body.permanentCashbackRate 
  ? parseFloat(req.body.permanentCashbackRate) 
  : undefined;

// Parser les tableaux JSON
let marketingPrograms: string[] = [];
if (req.body.marketingPrograms) {
  try {
    marketingPrograms = JSON.parse(req.body.marketingPrograms);
  } catch (error) {
    // Gérer l'erreur
  }
}
```

### 3. Gérer les fichiers uploadés

```typescript
// Les fichiers sont dans req.files ou req.file selon votre middleware
const logo = req.files?.logo?.[0] || req.file;
const kbis = req.files?.kbis?.[0];
// etc.
```

## 🐛 Diagnostic à effectuer

1. **Vérifier les logs du serveur** :
   - Ajouter des `console.log` ou utiliser un logger pour voir exactement ce qui est reçu
   - Logger `req.body` et `req.files` au début du contrôleur
   - Logger les erreurs complètes avec stack trace

2. **Vérifier le middleware de parsing** :
   - S'assurer que `multipart/form-data` est correctement configuré
   - Vérifier que les fichiers sont bien parsés
   - Vérifier que les champs texte sont bien disponibles dans `req.body`

3. **Vérifier la validation** :
   - S'assurer que les validations ne rejettent pas les données à tort
   - Vérifier que les types sont correctement convertis avant validation

4. **Vérifier la base de données** :
   - S'assurer que le schéma de la table correspond aux données
   - Vérifier les contraintes (foreign keys, unique, etc.)
   - Vérifier que les relations sont correctes

## ✅ Code de correction suggéré

Voici un exemple de ce que le contrôleur devrait faire :

```typescript
async createPartner(req: Request, res: Response) {
  try {
    // 1. Logger les données reçues (en développement)
    if (process.env.NODE_ENV === 'development') {
      console.log('📥 Données reçues:', {
        body: req.body,
        files: req.files,
        file: req.file,
      });
    }

    // 2. Parser territories
    let territories: string[] = [];
    if (req.body.territories) {
      try {
        territories = JSON.parse(req.body.territories);
        if (!Array.isArray(territories)) {
          throw new Error('territories doit être un tableau');
        }
      } catch (error) {
        return res.status(400).json({
          error: {
            message: 'Format invalide pour territories',
            code: 'INVALID_TERRITORIES',
            details: { received: req.body.territories, error: error.message }
          }
        });
      }
    } else if (req.body.territory) {
      // Fallback sur l'ancien format
      territories = [req.body.territory];
    } else {
      return res.status(400).json({
        error: {
          message: 'Au moins un territoire est requis',
          code: 'MISSING_TERRITORY'
        }
      });
    }

    // 3. Convertir les types
    const partnerData = {
      name: req.body.name,
      siret: req.body.siret || null,
      phone: req.body.phone || null,
      category: req.body.category,
      territories: territories,
      territory: territories[0], // Pour compatibilité
      status: req.body.status || 'pending',
      giftCardEnabled: req.body.giftCardEnabled === 'true',
      boostEnabled: req.body.boostEnabled === 'true',
      discoveryCashbackRate: req.body.discoveryCashbackRate 
        ? parseFloat(req.body.discoveryCashbackRate) 
        : null,
      permanentCashbackRate: req.body.permanentCashbackRate 
        ? parseFloat(req.body.permanentCashbackRate) 
        : null,
      giftCardCashbackRate: req.body.giftCardCashbackRate 
        ? parseFloat(req.body.giftCardCashbackRate) 
        : null,
      boostRate: req.body.boostRate 
        ? parseFloat(req.body.boostRate) 
        : null,
      marketingPrograms: req.body.marketingPrograms 
        ? JSON.parse(req.body.marketingPrograms) 
        : [],
      openingDays: req.body.openingDays 
        ? JSON.parse(req.body.openingDays) 
        : [],
      // ... autres champs
    };

    // 4. Gérer les fichiers
    // ... code pour uploader les fichiers et stocker les URLs

    // 5. Créer le partenaire
    const partner = await partnerService.create(partnerData);

    // 6. Retourner la réponse
    return res.status(201).json({
      data: partner,
      error: null
    });

  } catch (error) {
    // 7. Gérer les erreurs avec des messages détaillés
    console.error('❌ Erreur lors de la création du partenaire:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });

    return res.status(500).json({
      error: {
        message: error.message || 'Erreur lors de la création du partenaire',
        code: error.code || 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' 
          ? { stack: error.stack, originalError: error.message }
          : undefined
      }
    });
  }
}
```

## 🧪 Test à effectuer

Créer un partenaire avec ces données exactes :

```
name: "SECURIDOM"
siret: "420 233 462 00027"
phone: "+596 596766059"
category: "Services"
territories: '["martinique"]'
territory: "martinique"
status: "pending"
giftCardEnabled: "false"
boostEnabled: "false"
discoveryCashbackRate: "0"
permanentCashbackRate: "0"
```

## 📝 Checklist de correction

- [ ] Ajouter des logs détaillés au début du contrôleur
- [ ] Parser correctement `territories` (chaîne JSON → tableau)
- [ ] Convertir tous les types (string → number, string → boolean)
- [ ] Parser `marketingPrograms` et `openingDays` (chaînes JSON)
- [ ] Gérer les fichiers uploadés correctement
- [ ] Améliorer les messages d'erreur (ne pas retourner juste "Erreur interne inattendue")
- [ ] Logger les erreurs complètes avec stack trace
- [ ] Tester avec les données exactes du frontend
- [ ] Vérifier que la réponse suit le format `{ data, error }`

## 🎯 Résultat attendu

Après correction, la création d'un partenaire doit :
1. ✅ Accepter les données au format envoyé par le frontend
2. ✅ Parser correctement tous les champs (JSON, types, etc.)
3. ✅ Créer le partenaire en base de données
4. ✅ Retourner une réponse 201 avec le partenaire créé
5. ✅ En cas d'erreur, retourner un message détaillé et utile

---

**Action immédiate : Ouvrez les logs du serveur backend, tentez de créer un partenaire depuis le frontend, et identifiez l'erreur exacte dans les logs. Ensuite, corrigez le code selon les instructions ci-dessus.**
