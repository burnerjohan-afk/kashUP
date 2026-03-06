# Compte de test — KashUP

Pour tester la connexion et la page **Mon compte** sur le site.

## Identifiants de test

| Champ           | Valeur             |
|----------------|--------------------|
| **Email**      | `test@kashup.com`  |
| **Mot de passe** | `Test123!`       |

Connectez-vous sur **/connexion** avec ces identifiants.

---

## Créer l’utilisateur de test (une fois)

**Option 1 — Via l’API (recommandé)**  
Avec l’API KashUP démarrée (ex. `npm run dev` dans `kashup-api`) :

```bash
cd kashup-api
npx tsx scripts/create-test-user.ts
```

Cela enregistre l’utilisateur `test@kashup.com` / `Test123!`. Si le compte existe déjà, le script l’indique et vous pouvez quand même vous connecter.

**Option 2 — Via le seed Prisma**  
Si votre base est à jour (migrations appliquées) :

```bash
cd kashup-api
npx prisma db seed
```

Crée aussi l’admin et l’utilisateur de test (wallet avec 45,50 € et 320 points).

---

## Compte partenaire démo (espace partenaire)

Pour tester le **tableau de bord partenaire** (`/espace-partenaire`) :

| Champ           | Valeur                   |
|----------------|--------------------------|
| **Email**      | `partenaire@kashup.com`  |
| **Mot de passe** | `Partenaire123!`      |

Créé par le seed Prisma (`npx prisma db seed`). Le partenaire lié est « Partenaire Démo » (catégorie Restauration).

---

## Compte admin (si seed exécuté)

| Champ           | Valeur              |
|----------------|---------------------|
| **Email**      | `admin@kashup.com`  |
| **Mot de passe** | `Kashup123!`      |
