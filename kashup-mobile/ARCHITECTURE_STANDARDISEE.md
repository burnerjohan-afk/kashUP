# Architecture Standardisée - Kashup Mobile

## 📋 Résumé

Cette architecture standardise toutes les ressources API vers `/api/v1` avec un pattern cohérent pour :
- **partners** (partenaires)
- **boxups**
- **carteups**
- **vouchers** (bons d'achat)
- **lotteries**
- **badges**

## 📁 Fichiers Créés/Modifiés

### Configuration

1. **`src/config/runtime.ts`** ✅ CRÉÉ
   - Détection automatique de l'IP via Expo hostUri
   - `apiOrigin`: `http://<host>:4000`
   - `apiBaseUrl`: `http://<host>:4000/api/v1`
   - Fallback `localhost` si hostUri introuvable

2. **`src/config/api.ts`** ✅ MODIFIÉ
   - Utilise maintenant `runtime.ts`
   - Conservé pour compatibilité

### Utilitaires

3. **`src/utils/normalizeUrl.ts`** ✅ CRÉÉ
   - Normalise les URLs d'images
   - Gère `/uploads/` → `apiOrigin + imagePath`
   - Placeholder si null/undefined

### Services

4. **`src/services/resourceService.ts`** ✅ CRÉÉ
   - Service générique réutilisable
   - Méthodes `list()` et `get(id)`

5. **`src/services/partners.service.ts`** ✅ MODIFIÉ
   - Ajout de `getPartner(id)`
   - Utilise le pattern standardisé

6. **`src/services/boxups.service.ts`** ✅ CRÉÉ
   - `listBoxUps(filters?)` → `GET /api/v1/boxups`
   - `getBoxUp(id)` → `GET /api/v1/boxups/:id`

7. **`src/services/carteups.service.ts`** ✅ CRÉÉ
   - `listCarteUps(filters?)` → `GET /api/v1/carteups`
   - `getCarteUp(id)` → `GET /api/v1/carteups/:id`

8. **`src/services/vouchers.service.ts`** ✅ CRÉÉ
   - `listVouchers(filters?)` → `GET /api/v1/vouchers`
   - `getVoucher(id)` → `GET /api/v1/vouchers/:id`
   - Note: Utilise `vouchers` (peut être changé en `giftcards` selon l'API)

9. **`src/services/lotteries.service.ts`** ✅ CRÉÉ
   - `listLotteries(filters?)` → `GET /api/v1/lotteries`
   - `getLottery(id)` → `GET /api/v1/lotteries/:id`

10. **`src/services/badges.service.ts`** ✅ CRÉÉ
    - `listBadges(filters?)` → `GET /api/v1/badges`
    - `getBadge(id)` → `GET /api/v1/badges/:id`

### Routes Expo Router

11. **`app/partenaires/index.tsx`** ✅ CRÉÉ
    - Liste des partenaires
    - Recherche intégrée
    - Pull-to-refresh

12. **`app/partenaires/[id].tsx`** ✅ CRÉÉ
    - Détail d'un partenaire
    - **JAMAIS KBIS/SIRET** (seulement infos utiles)
    - Liens vers site web, Facebook, Instagram

### Écrans Modifiés

13. **`screens/HomeScreen.tsx`** ✅ MODIFIÉ
    - Navigation vers `/partenaires/[id]` via Expo Router
    - Utilise `useRouter()` d'expo-router

## 🔌 Points de Branchement

### Accueil (HomeScreen)

**Fichier**: `screens/HomeScreen.tsx`

**Fonction**: `handlePartnerPress(partnerId: string)`

```typescript
const handlePartnerPress = (partnerId: string) => {
  router.push({
    pathname: '/partenaires/[id]',
    params: { id: partnerId },
  } as any);
};
```

**Utilisé dans**:
- `PepiteCard` → `onPress={() => handlePartnerPress(partner.id)}`
- `CashbackCard` → `onPress={() => handlePartnerPress(partner.id)}`
- `MostSearchedCard` → `onPress={() => handlePartnerPress(partner.id)}`

### Onglet Partenaires

**Fichier**: `app/partenaires/index.tsx`

**Route**: `/partenaires`

**Fonctionnalités**:
- Liste complète des partenaires
- Recherche en temps réel
- Pull-to-refresh
- Navigation vers détail au clic

## 🚀 Commandes Terminal

### Démarrer l'application

```bash
npx expo start -c --lan
```

**Explication**:
- `-c`: Clear cache
- `--lan`: Mode LAN pour détection IP automatique

### Vérifier les dépendances

```bash
npx expo doctor
```

### Installer les dépendances manquantes

```bash
npx expo install expo-router expo-constants
```

## ✅ Checklist de Test

### Configuration API

- [ ] L'IP est détectée automatiquement au démarrage
- [ ] Les logs affichent `API Origin: http://<IP>:4000`
- [ ] Les logs affichent `API Base URL: http://<IP>:4000/api/v1`
- [ ] Fallback `localhost` si hostUri introuvable (non bloquant)

### Partenaires - Liste

- [ ] Route `/partenaires` affiche la liste
- [ ] Les logos s'affichent correctement (normalisés)
- [ ] La recherche fonctionne
- [ ] Pull-to-refresh fonctionne
- [ ] Les cartes sont cliquables

### Partenaires - Détail

- [ ] Route `/partenaires/[id]` affiche le détail
- [ ] Le logo s'affiche (normalisé)
- [ ] Les infos utiles sont présentes (nom, description, cashback, localisation)
- [ ] **AUCUN KBIS/SIRET** n'est affiché
- [ ] Les liens (site web, Facebook, Instagram) sont cliquables
- [ ] Le bouton retour fonctionne

### Navigation depuis Accueil

- [ ] Clic sur "Pépites KashUP" → navigation vers `/partenaires/[id]`
- [ ] Clic sur "Les plus gros cashback" → navigation vers `/partenaires/[id]`
- [ ] Clic sur "Les plus recherchés" → navigation vers `/partenaires/[id]`

### Images/Logos

- [ ] Les logos commençant par `http` s'affichent
- [ ] Les logos commençant par `/uploads/` sont normalisés vers `apiOrigin + /uploads/...`
- [ ] Les logos `null` affichent un placeholder
- [ ] Pas d'erreur 404 pour les images

### Autres Ressources (à implémenter)

- [ ] BoxUps: liste et détail fonctionnent
- [ ] CarteUps: liste et détail fonctionnent
- [ ] Vouchers: liste et détail fonctionnent
- [ ] Loteries: liste et détail fonctionnent
- [ ] Badges: liste et détail fonctionnent

## 📝 Notes Importantes

### Convention Routes API

Toutes les routes suivent le pattern:
- **Liste**: `GET /api/v1/<resource>`
- **Détail**: `GET /api/v1/<resource>/:id`

### Normalisation des Images

Les images sont normalisées via `normalizeImageUrl()`:
- URLs complètes (`http://...`) → utilisées telles quelles
- Chemins relatifs (`/uploads/...`) → préfixés avec `apiOrigin`
- `null`/`undefined` → placeholder

### Navigation

L'application utilise **Expo Router** pour la navigation vers les détails:
- Pattern: `router.push({ pathname: '/partenaires/[id]', params: { id } })`
- Compatible avec React Navigation existant

### Données Sensibles

**JAMAIS** afficher:
- KBIS
- SIRET
- Données bancaires
- Informations personnelles sensibles

**TOUJOURS** afficher:
- Nom
- Description
- Cashback
- Localisation
- Liens sociaux (si disponibles)

## 🔄 Prochaines Étapes

Pour compléter l'implémentation:

1. **Créer les routes Expo Router** pour les autres ressources:
   - `app/boxups/index.tsx` et `app/boxups/[id].tsx`
   - `app/carteups/index.tsx` et `app/carteups/[id].tsx`
   - `app/vouchers/index.tsx` et `app/vouchers/[id].tsx`
   - `app/lotteries/index.tsx` et `app/lotteries/[id].tsx`
   - `app/badges/index.tsx` et `app/badges/[id].tsx`

2. **Créer les écrans liste et détail** pour chaque ressource (pattern identique à `partenaires`)

3. **Ajouter les liens dans le bottom tab** si nécessaire

4. **Tester toutes les routes** avec l'API backend

## 🐛 Dépannage

### L'IP n'est pas détectée

Vérifier que:
- Expo est démarré avec `--lan`
- Le téléphone et le PC sont sur le même réseau
- Les logs affichent le hostUri dans la console

### Les images ne s'affichent pas

Vérifier:
- Que `normalizeImageUrl()` est utilisé partout
- Que `apiOrigin` est correct
- Les logs de chargement d'images dans la console

### Erreur de navigation

Vérifier:
- Que `expo-router` est installé
- Que les routes existent dans `app/`
- Que les paramètres sont passés correctement

