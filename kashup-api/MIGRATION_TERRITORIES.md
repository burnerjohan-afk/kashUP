# 🔄 Migration : Territory → Territories

## 📋 Résumé

Migration du modèle `Partner` pour remplacer le champ `territory` (String unique) par `territories` (JSON array de strings).

## ✅ Modifications effectuées

### 1. Schéma Prisma (`prisma/schema.prisma`)

**Avant :**
```prisma
territory String @default("Martinique")
```

**Après :**
```prisma
territories String? // JSON array: ['Martinique', 'Guadeloupe', 'Guyane']
```

**Index supprimé :**
- `@@index([territory])` a été retiré (les index sur JSON ne sont pas supportés efficacement)

### 2. Schéma Zod (`src/schemas/partner.schema.ts`)

- `territory` remplacé par `territories: z.array(z.enum(TERRITORIES))`
- Support de la conversion depuis string JSON
- Validation : au moins un territoire requis

### 3. Services (`src/services/partner.service.ts`)

- `buildWhere` : Filtre par `territories` (contains sur JSON string)
- `formatPartnerResponse` : Parse `territories` depuis JSON
- `createPartner` : Stocke `territories` comme JSON string
- `updatePartner` : Met à jour `territories` comme JSON string
- `listPartners` : Ajout de la pagination

### 4. Contrôleurs (`src/controllers/partner.controller.ts`)

- `processFormData` : Convertit `territory` (ancien format) en `territories` (array)
- Support de la compatibilité ascendante

### 5. Format de réponse (`src/utils/response.ts`)

- Nouveau format : `{ statusCode, success, message, data, meta? }`
- Compatibilité avec l'ancien format maintenue

## 🚀 Migration de la base de données

### Étape 1 : Créer la migration

```bash
npx prisma migrate dev --name replace_territory_with_territories
```

**OU** utiliser la migration SQL manuelle créée dans :
`prisma/migrations/20241220000000_replace_territory_with_territories/migration.sql`

### Étape 2 : Migrer les données existantes

La migration SQL :
1. Ajoute la colonne `territories` (nullable)
2. Migre les valeurs existantes : `territories = json_array(territory)`
3. Définit la valeur par défaut pour NULL : `['Martinique']`

**Note :** SQLite ne supporte pas `DROP COLUMN` directement. Pour supprimer complètement `territory`, il faudrait recréer la table. Pour l'instant, les deux colonnes coexistent.

### Étape 3 : Régénérer le client Prisma

```bash
npx prisma generate
```

**⚠️ Important :** Arrêter l'API avant de régénérer Prisma pour éviter les erreurs de permission.

## 📝 Format des données

### Stockage en base (JSON string)
```json
"[\"Martinique\", \"Guadeloupe\"]"
```

### Format API (array)
```json
{
  "territories": ["Martinique", "Guadeloupe"]
}
```

## 🔄 Compatibilité

- **Ancien format** : `territory: "Martinique"` → Converti automatiquement en `territories: ["Martinique"]`
- **Nouveau format** : `territories: ["Martinique", "Guadeloupe"]` → Utilisé directement

## ✅ Vérifications

- [x] Schéma Prisma modifié
- [x] Schéma Zod mis à jour
- [x] Services adaptés
- [x] Contrôleurs adaptés
- [x] Format de réponse standardisé
- [x] Pagination ajoutée
- [ ] Migration Prisma créée (à faire)
- [ ] Client Prisma régénéré (à faire après redémarrage API)

## 🐛 Problèmes connus

1. **Prisma generate échoue** : L'API doit être arrêtée avant de régénérer
2. **Migration SQLite** : Ne peut pas supprimer `territory` directement (nécessite recréation de table)

## 📌 Prochaines étapes

1. **Arrêter l'API** (Ctrl+C)
2. **Créer la migration** : `npx prisma migrate dev --name replace_territory_with_territories`
3. **Régénérer Prisma** : `npx prisma generate`
4. **Redémarrer l'API** : `npm run dev`
5. **Tester** : Créer/mettre à jour un partenaire avec `territories`

---

**Migration prête. Redémarrer l'API et exécuter les commandes Prisma.**

