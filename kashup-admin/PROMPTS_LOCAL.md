# Prompts pour kashup-api et kashup-mobile (Environnement Local)

## Prompt pour kashup-api

Dans le back-office admin (kashup-admin), les programmes marketing des partenaires ont été modifiés. Il faut mettre à jour l'API backend pour refléter ces changements.

### Modifications à effectuer :

1. **Mise à jour du modèle/schéma Partner** :
   - Le champ `marketingPrograms` doit accepter un tableau de valeurs parmi : `'pepites'`, `'boosted'`, `'most-searched'`
   - Supprimer toute référence à `'not-to-miss'` (ancien programme "À ne pas manquer")
   - Les valeurs possibles sont maintenant :
     - `'pepites'` : Pépites KashUP
     - `'boosted'` : Partenaires boostés (nouveau)
     - `'most-searched'` : Partenaires les plus recherchés (nouveau)

2. **Mise à jour des endpoints** :
   - Endpoint `POST /api/partners` : Accepter `marketingPrograms` comme tableau JSON dans le FormData
   - Endpoint `PUT /api/partners/:id` : Accepter `marketingPrograms` comme tableau JSON dans le FormData
   - Endpoint `GET /api/partners` : Retourner `marketingPrograms` avec les nouvelles valeurs
   - Endpoint `GET /api/partners/:id` : Retourner `marketingPrograms` avec les nouvelles valeurs

3. **Validation** :
   - Valider que `marketingPrograms` est un tableau optionnel
   - Valider que chaque élément du tableau est l'une des valeurs autorisées : `'pepites'`, `'boosted'`, `'most-searched'`
   - Rejeter toute valeur `'not-to-miss'` si elle existe encore dans la base de données

4. **Migration de données (si nécessaire)** :
   - Si des partenaires ont encore `'not-to-miss'` dans leur `marketingPrograms`, vous pouvez soit :
     - Les supprimer (recommandé)
     - Les migrer vers `'boosted'` si cela fait sens pour votre logique métier

5. **Tests locaux** :
   - Tester la création d'un partenaire avec les nouveaux programmes marketing
   - Tester la mise à jour d'un partenaire avec les nouveaux programmes marketing
   - Vérifier que l'API retourne correctement les programmes marketing dans les réponses

### Exemple de payload attendu depuis le back-office :

```json
{
  "name": "Nom du partenaire",
  "category": "Restauration",
  "marketingPrograms": ["pepites", "boosted", "most-searched"],
  // ... autres champs
}
```

### Note importante :
- L'application est en développement local, pas encore déployée
- L'API backend doit être accessible sur `http://localhost:5173` (ou le port que vous utilisez)
- Assurez-vous que CORS est configuré pour accepter les requêtes depuis le frontend admin

---

## Prompt pour kashup-mobile

Dans le back-office admin (kashup-admin), les programmes marketing des partenaires ont été modifiés. Il faut mettre à jour l'application mobile pour afficher correctement les nouveaux programmes marketing.

### Modifications à effectuer :

1. **Mise à jour du modèle Partner** :
   - Le champ `marketingPrograms` doit être un tableau optionnel de type : `Array<'pepites' | 'boosted' | 'most-searched'>`
   - Supprimer toute référence à `'not-to-miss'` (ancien programme "À ne pas manquer")
   - Les valeurs possibles sont maintenant :
     - `'pepites'` : Pépites KashUP
     - `'boosted'` : Partenaires boostés (nouveau)
     - `'most-searched'` : Partenaires les plus recherchés (nouveau)

2. **Mise à jour de l'affichage** :
   - Si vous affichez les badges/étiquettes des programmes marketing sur les partenaires :
     - Supprimer le badge "À ne pas manquer"
     - Ajouter le badge "Partenaires boostés" pour `'boosted'`
     - Ajouter le badge "Partenaires les plus recherchés" pour `'most-searched'`
     - Conserver le badge "Pépites KashUP" pour `'pepites'`

3. **Mise à jour des filtres/recherches** :
   - Si vous avez des filtres par programme marketing :
     - Supprimer le filtre "À ne pas manquer"
     - Ajouter le filtre "Partenaires boostés"
     - Ajouter le filtre "Partenaires les plus recherchés"

4. **Mise à jour des sections/écrans** :
   - Si vous avez une section "À ne pas manquer" :
     - La remplacer par "Partenaires boostés" (pour les partenaires avec `marketingPrograms` contenant `'boosted'`)
     - Ajouter une section "Partenaires les plus recherchés" (pour les partenaires avec `marketingPrograms` contenant `'most-searched'`)

5. **Gestion des données existantes** :
   - Si des partenaires ont encore `'not-to-miss'` dans leur `marketingPrograms` :
     - Ne pas les afficher dans les sections de programmes marketing
     - Ou les ignorer silencieusement lors du filtrage

6. **Tests locaux** :
   - Tester l'affichage des partenaires avec les nouveaux programmes marketing
   - Tester les filtres avec les nouveaux programmes
   - Vérifier que les sections "Partenaires boostés" et "Partenaires les plus recherchés" s'affichent correctement
   - Vérifier que l'application ne plante pas si un partenaire a encore `'not-to-miss'` (rétrocompatibilité)

### Exemple de structure de données attendue depuis l'API :

```json
{
  "id": "partner-id",
  "name": "Nom du partenaire",
  "marketingPrograms": ["pepites", "boosted", "most-searched"],
  // ... autres champs
}
```

### Note importante :
- L'application est en développement local, pas encore déployée
- L'API backend doit être accessible depuis l'application mobile (vérifier l'URL de l'API dans votre configuration)
- Assurez-vous que l'application mobile peut se connecter à l'API backend locale
- Si vous utilisez un émulateur/simulateur, vérifiez que l'URL de l'API pointe vers `http://localhost` ou `http://10.0.2.2` (Android) ou l'IP locale de votre machine

---

## Résumé des changements

### Avant :
- Programmes marketing : `'pepites'`, `'not-to-miss'`

### Après :
- Programmes marketing : `'pepites'`, `'boosted'`, `'most-searched'`

### Actions :
1. ✅ Back-office admin (kashup-admin) : Modifications déjà effectuées
2. ⏳ API backend (kashup-api) : À faire (voir prompt ci-dessus)
3. ⏳ Application mobile (kashup-mobile) : À faire (voir prompt ci-dessus)

