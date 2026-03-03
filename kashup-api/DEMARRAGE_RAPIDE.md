# 🚀 Démarrage rapide - Résolution de l'erreur 500

## ⚡ Solution en 3 étapes

### Étape 1 : Exécuter le seed pour créer les catégories

Le seed crée automatiquement les catégories nécessaires, y compris "Services" :

```bash
cd C:\kashup\kashup-api
npm run prisma:seed
```

**Résultat attendu :**
```
🌱 Seed minimal exécuté.
```

### Étape 2 : Redémarrer l'API

```bash
# Arrêter le serveur actuel (Ctrl+C)
# Puis redémarrer :
npm run dev
```

**Vérifier que l'API démarre :**
```
🚀 KashUP API prête sur http://localhost:4000
```

### Étape 3 : Tester la création d'un partenaire

1. Ouvrir `kashup-admin` (http://localhost:5173)
2. Se connecter avec :
   - Email : `admin@kashup.com`
   - Mot de passe : `Kashup123!`
3. Créer un nouveau partenaire

**Vérifier les logs de l'API** - Vous devriez voir :
```
📥 Données reçues pour création de partenaire
🔄 Début du traitement des données
✅ Catégorie trouvée: Services
📋 Données traitées après conversion
✅ Validation réussie, création du partenaire
✅ Partenaire créé avec succès
📡 Émission du webhook vers l'application mobile
✅ Webhook émis avec succès
```

## ✅ Vérification rapide

### Vérifier que les catégories existent

```bash
curl http://localhost:4000/partners/categories
```

**Résultat attendu :**
```json
{
  "data": [
    {"id": "...", "name": "Services"},
    {"id": "...", "name": "Supermarché"},
    {"id": "...", "name": "Loisirs"},
    ...
  ],
  "error": null,
  "meta": null
}
```

### Vérifier que l'API répond

```bash
curl http://localhost:4000/health
```

**Résultat attendu :**
```json
{
  "data": {"status": "ok", "env": "development"},
  "error": null,
  "meta": null
}
```

## 🔄 Flux complet de liaison

```
┌─────────────────┐         ┌──────────────┐         ┌──────────────────┐
│  kashup-admin   │ ──────► │  kashup-api  │ ──────► │  kashup-mobile   │
│  (Back Office)  │  POST   │   (API)      │ Webhook │  (App Mobile)    │
│                 │ /partners│              │         │                  │
└─────────────────┘         └──────────────┘         └──────────────────┘
    1. Création               2. Sauvegarde DB        3. Notification
                               + Webhook               + Sync
```

### Ce qui se passe automatiquement :

1. **Back Office** crée un partenaire → Envoie à l'API
2. **API** :
   - ✅ Parse les données
   - ✅ Convertit les types
   - ✅ Valide avec Zod
   - ✅ Sauvegarde en base de données
   - ✅ Envoie un webhook à l'application mobile (si configuré)
3. **Application Mobile** reçoit le webhook → Synchronise les données

## 🐛 Si l'erreur 500 persiste

### Vérifier les logs du serveur

Regardez attentivement les logs dans le terminal où tourne `npm run dev`.

**Si vous voyez :**
- `❌ Catégorie introuvable` → Exécuter `npm run prisma:seed`
- `❌ Erreur de validation` → Vérifier les champs obligatoires dans les logs
- `❌ Erreur Prisma` → Vérifier les contraintes de base de données

### Vérifier la base de données

```bash
npx prisma studio
```

Dans Prisma Studio :
1. Ouvrir la table `PartnerCategory`
2. Vérifier que "Services" existe
3. Si elle n'existe pas, la créer manuellement

## 📝 Configuration des webhooks (optionnel)

Pour activer la synchronisation avec l'application mobile :

1. **Dans `kashup-api/.env`** :
   ```env
   MOBILE_WEBHOOK_URL="http://localhost:8080/api/webhooks"
   ```

2. **Redémarrer l'API**

3. **Dans l'application mobile**, créer l'endpoint :
   ```
   POST /api/webhooks
   ```

## 🎯 Résultat final

Une fois tout configuré :

✅ **Back Office** : Création/modification fonctionne  
✅ **API** : Sauvegarde + logs détaillés  
✅ **Webhook** : Envoi automatique vers l'app mobile  
✅ **Application Mobile** : Synchronisation des données  

**La liaison complète est opérationnelle !** 🎉

