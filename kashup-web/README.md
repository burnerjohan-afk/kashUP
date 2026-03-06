# KashUP — Site vitrine

Site internet de présentation de KashUP : principe de l’application, partenaires, cashbacks, cartes & box, et lien vers le téléchargement de l’app.

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS**
- **TypeScript**

## Démarrage

```bash
npm install
cp .env.example .env.local
# Éditer .env.local : NEXT_PUBLIC_API_URL pointe vers votre API (ex. http://localhost:4000/api/v1)
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Variables d’environnement

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | URL de base de l’API KashUP (avec `/api/v1`), ex. `http://localhost:4000/api/v1` |

## Contenu du site

- **Accueil** : principe KashUP, comment ça marche
- **Partenaires** : liste des partenaires (données API)
- **Cashback** : tableau des taux par partenaire
- **Cartes & Box** : offres et box (données API)
- **Télécharger l’app** : liens App Store et Google Play (à mettre à jour avec les vrais liens une fois les apps publiées)

## Build

```bash
npm run build
npm start
```

## Déploiement

Le projet peut être déployé sur Vercel, Netlify ou tout hébergeur supportant Next.js. Penser à définir `NEXT_PUBLIC_API_URL` en production.
