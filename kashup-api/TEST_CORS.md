# 🧪 Test de la configuration CORS

## Test depuis PowerShell (Windows)

PowerShell utilise `curl` comme alias pour `Invoke-WebRequest`, qui a une syntaxe différente. Utilisez une de ces méthodes :

### Méthode 1 : Utiliser curl.exe directement

```powershell
curl.exe -H "Origin: exp://localhost:8081" http://localhost:4000/health
```

### Méthode 2 : Utiliser Invoke-WebRequest avec la syntaxe PowerShell

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/health" -Headers @{"Origin"="exp://localhost:8081"}
```

### Méthode 3 : Utiliser Invoke-RestMethod (retourne juste le JSON)

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/health" -Headers @{"Origin"="exp://localhost:8081"}
```

## Test depuis un navigateur

Ouvrez la console du navigateur (F12) et exécutez :

```javascript
fetch('http://localhost:4000/health', {
  headers: {
    'Origin': 'exp://localhost:8081'
  }
})
.then(res => {
  console.log('Headers CORS:', {
    'Access-Control-Allow-Origin': res.headers.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Credentials': res.headers.get('Access-Control-Allow-Credentials')
  });
  return res.json();
})
.then(data => console.log('Réponse:', data))
.catch(err => console.error('Erreur:', err));
```

## Test depuis kashup-mobile (React Native)

Dans votre code React Native, testez avec :

```typescript
// Dans kashup-mobile
const testCORS = async () => {
  try {
    const response = await fetch('http://localhost:4000/health', {
      method: 'GET',
      headers: {
        'Origin': 'exp://localhost:8081'
      }
    });
    
    console.log('✅ CORS fonctionne !');
    console.log('Headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
    });
    
    const data = await response.json();
    console.log('Réponse:', data);
  } catch (error) {
    console.error('❌ Erreur CORS:', error);
  }
};

testCORS();
```

## Vérification des headers CORS attendus

Si la configuration fonctionne, vous devriez voir ces headers dans la réponse :

```
Access-Control-Allow-Origin: exp://localhost:8081
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Webhook-Source, X-Webhook-Event
```

## Test de requête preflight (OPTIONS)

Pour tester la requête preflight :

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/health" -Method OPTIONS -Headers @{"Origin"="exp://localhost:8081"; "Access-Control-Request-Method"="POST"}
```

Cette requête devrait retourner un statut 200 avec les headers CORS appropriés.

