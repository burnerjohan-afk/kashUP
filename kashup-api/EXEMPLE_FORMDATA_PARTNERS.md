# 📋 Exemple Structure FormData pour POST /partners

## Structure attendue

### Champs texte (tous optionnels sauf `name` et `category`/`categories`)

```javascript
const formData = new FormData();

// Champs obligatoires
formData.append('name', 'Carrefour Dillon');
formData.append('category', 'Supermarché'); // OU
formData.append('categories', JSON.stringify(['Supermarché'])); // Array JSON stringifié

// Champs optionnels
formData.append('shortDescription', 'Description courte');
formData.append('description', 'Description complète');
formData.append('tauxCashbackBase', '5'); // String (sera converti en number)
formData.append('territories', JSON.stringify(['Martinique', 'Guadeloupe'])); // Array JSON stringifié
formData.append('latitude', '14.6167'); // String (sera converti en number)
formData.append('longitude', '-61.0588'); // String (sera converti en number)
formData.append('boostable', 'true'); // String (sera converti en boolean)
formData.append('marketingPrograms', JSON.stringify(['pepites', 'boosted'])); // Array JSON stringifié
```

### Fichier image (optionnel)

```javascript
// Seul le champ "logo" est accepté
const logoFile = document.getElementById('logoInput').files[0]; // File object
formData.append('logo', logoFile); // ⚠️ Le nom du champ DOIT être "logo"
```

## Types de fichiers acceptés pour logo

- `image/jpeg`
- `image/jpg`
- `image/png`
- `image/webp`
- `image/gif`

**Taille max :** 5MB

## Exemple complet (JavaScript/TypeScript)

```typescript
const createPartner = async (data: {
  name: string;
  category: string;
  territories: string[];
  logo?: File;
  // ... autres champs
}) => {
  const formData = new FormData();
  
  // Champs texte
  formData.append('name', data.name);
  formData.append('category', data.category);
  formData.append('territories', JSON.stringify(data.territories));
  
  // Fichier logo (optionnel)
  if (data.logo) {
    formData.append('logo', data.logo); // ⚠️ Nom exact: "logo"
  }
  
  const response = await fetch('http://localhost:4000/api/v1/partners', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // ⚠️ NE PAS mettre Content-Type: multipart/form-data (le navigateur le fait automatiquement)
    },
    body: formData
  });
  
  return response.json();
};
```

## Exemple avec React

```tsx
const PartnerForm = () => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    
    // Ajouter le logo si présent
    if (logoFile) {
      formData.append('logo', logoFile); // ⚠️ Nom exact: "logo"
    }
    
    // Parser les arrays
    const territories = ['Martinique', 'Guadeloupe'];
    formData.set('territories', JSON.stringify(territories));
    
    const response = await fetch('/api/v1/partners', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Erreur:', error);
      return;
    }
    
    const partner = await response.json();
    console.log('Partenaire créé:', partner);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="category" required />
      <input 
        type="file" 
        accept="image/*" 
        onChange={(e) => setLogoFile(e.target.files?.[0] || null)} 
      />
      <button type="submit">Créer</button>
    </form>
  );
};
```

## Erreurs possibles

### 400 Bad Request - "Champ de fichier inattendu"
**Cause :** Le nom du champ fichier n'est pas "logo"  
**Solution :** Utiliser exactement `formData.append('logo', file)`

### 400 Bad Request - "Type de fichier non autorisé"
**Cause :** Le fichier n'est pas une image valide  
**Solution :** Vérifier le mimetype (JPEG, PNG, WebP, GIF uniquement)

### 422 Unprocessable Entity - "Données invalides"
**Cause :** Validation Zod échouée  
**Solution :** Vérifier que tous les champs requis sont présents et valides

## Notes importantes

1. **Nom du champ fichier :** DOIT être exactement `"logo"` (pas `"logoFile"`, `"image"`, etc.)
2. **Content-Type :** Ne pas le définir manuellement, le navigateur le fait automatiquement pour FormData
3. **Arrays :** Les tableaux (`territories`, `categories`, `marketingPrograms`) doivent être stringifiés en JSON
4. **Logo optionnel :** Le logo peut être absent, l'endpoint fonctionnera quand même
5. **Authentification :** L'endpoint requiert un token JWT valide avec rôle `admin` ou `partner`

