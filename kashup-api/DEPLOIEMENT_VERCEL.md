# 🚀 Déploiement kashup-api sur Vercel

## 📋 Diagnostic

### Structure du monorepo local (c:\kashup)

| Projet | Tech | Rôle |
|--------|------|------|
| **kashup-api** | Express + Prisma + TypeScript | API backend |
| **kashup-admin** | Vite + React | Interface admin |
| **kashup-web** | Next.js | Site web |
| **kashup-mobile** | Expo | App mobile |

### Ce qui se passe actuellement

- Vercel déploie le repo **github.com/burnerjohan-afk/kashupv0**
- Le build termine en **298 ms** → beaucoup trop rapide pour kashup-api (npm install, tsc, Prisma, etc.)
- **https://kashupv0.vercel.app** retourne **404** → le projet déployé n’est pas l’API

**Conclusion** : Vercel déploie très probablement autre chose (ou rien d’exploitable), pas kashup-api.

---

## ✅ Solution : configurer Vercel pour déployer kashup-api

### Étape 1 : Vérifier le Root Directory

1. Allez sur [vercel.com](https://vercel.com) → projet **kashupv0**
2. **Settings** → **General**
3. Section **Root Directory**
4. **Si c’est vide ou différent de `kashup-api`** → corrigez :
   - Cliquez sur **Edit**
   - Renseignez : `kashup-api`
   - Enregistrez

### Étape 2 : Vérifier la commande de build

- **Build Command** : laisser vide ou `npm run build` (tsc)
- **Output Directory** : laisser vide (Vercel gère Express)
- **Install Command** : `npm install` (par défaut)

### Étape 3 : Variables d’environnement

Dans **Settings** → **Environment Variables**, configurez au minimum :

| Variable | Exemple | Obligatoire |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | ✅ |
| `JWT_SECRET` | chaîne secrète | ✅ |
| `NODE_ENV` | `production` | recommandé |
| `CORS_ORIGIN` | `*` ou vos origines | recommandé |

### Étape 4 : Redéployer

Après changement du Root Directory :

1. **Deployments** → dernière deployment → **⋯** → **Redeploy**
2. Ou : **git push** sur la branche connectée

---

## 🔧 Si le Root Directory ne suffit pas

### Option A : Nouveau projet Vercel dédié à l’API

1. **Add New Project** sur Vercel
2. Importez le même repo : **burnerjohan-afk/kashupv0**
3. **Root Directory** : `kashup-api`
4. Ajoutez les variables d’environnement
5. Déployez

L’URL sera du type : `https://kashup-api-xxx.vercel.app`

Ensuite, mettez à jour `EXPO_PUBLIC_API_URL` dans `kashup-mobile/eas.json` avec cette URL, puis refaites un build EAS.

### Option B : Vérifier le contenu du repo kashupv0

Assurez-vous que le dépôt **kashupv0** contient bien le dossier **kashup-api** à la racine :

```
kashupv0/
├── kashup-api/
│   ├── src/
│   ├── package.json
│   └── ...
├── kashup-admin/
├── kashup-mobile/
└── ...
```

Si la structure est différente (ex. seul kashup-admin), le Root Directory doit pointer vers le bon dossier.

---

## ⚠️ Points importants pour Vercel

1. **Prisma** : `DATABASE_URL` doit pointer vers une base PostgreSQL accessible (Neon, Supabase, Vercel Postgres, etc.).

2. **Uploads** : Vercel n’a pas de stockage persistant. Les fichiers uploadés (images, etc.) doivent être stockés ailleurs (S3, Cloudinary, Vercel Blob, etc.).

3. **Jobs cron** : `registerJobs()` dans `server.ts` ne s’exécutera pas comme sur un serveur classique. Les crons doivent être gérés via [Vercel Cron](https://vercel.com/docs/cron-jobs) ou un service externe.

---

## 🧪 Tester après déploiement

Une fois déployé correctement :

- `https://VOTRE_URL.vercel.app/health` → doit répondre en JSON
- `https://VOTRE_URL.vercel.app/api/v1/health` → doit répondre en JSON

Ensuite, mettez à jour `eas.json` (preview/production) avec la bonne URL et rebuild l’APK.
