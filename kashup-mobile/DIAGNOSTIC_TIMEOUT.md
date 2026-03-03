# 🔍 Diagnostic Timeout API - Guide de dépannage

## 🎯 Problème

L'application affiche "timeout of 30000ms exceeded" lors des appels API.

## 📋 Checklist de diagnostic

### 1. Vérifier les logs au démarrage

Au démarrage de l'app, cherchez ces logs dans la console :

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[API Config] 📡 Configuration API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[API Config] EXPO_PUBLIC_API_URL = http://192.168.68.205:4000
[API Config] baseURL utilisé = http://192.168.68.205:4000
```

**✅ Si l'URL est correcte** → Passez à l'étape 2
**❌ Si l'URL est `localhost` ou incorrecte** → Vérifiez votre fichier `.env`

### 2. Vérifier que le serveur API est démarré

Sur votre PC, vérifiez que le serveur API tourne :

```bash
# Vérifier si le port 4000 est utilisé
netstat -ano | findstr :4000
```

**Si rien n'apparaît** → Le serveur API n'est pas démarré. Démarrez-le.

### 3. Tester la connexion depuis le PC

Depuis votre PC, testez si l'API répond :

```bash
curl http://192.168.68.205:4000/health
# ou
curl http://192.168.68.205:4000/partners
```

**✅ Si curl fonctionne** → Le serveur est OK, problème réseau mobile
**❌ Si curl ne fonctionne pas** → Le serveur n'est pas accessible, vérifiez le firewall

### 4. Vérifier le firewall Windows

Le firewall peut bloquer les connexions entrantes :

1. Ouvrir "Pare-feu Windows Defender"
2. Vérifier que le port 4000 est autorisé
3. Ou temporairement désactiver le firewall pour tester

### 5. Vérifier que PC et téléphone sont sur le même WiFi

- PC et téléphone doivent être sur le **même réseau WiFi**
- Vérifier l'IP du PC : `ipconfig` (chercher IPv4)
- L'IP doit commencer par la même série (ex: 192.168.68.x)

### 6. Vérifier les logs lors d'un appel API

Quand l'app fait un appel API, vous devriez voir :

```
[API] GET /partners [requestId: uuid]
[API] 🔗 URL finale appelée: http://192.168.68.205:4000/partners
[API] ⏱️  Timeout configuré: 30000ms
```

**Si l'URL est correcte mais timeout** → Problème réseau ou serveur ne répond pas

### 7. Test de connexion automatique

L'app lance automatiquement un test de connexion 2 secondes après le démarrage. Cherchez :

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Test API] 🧪 Test de connexion API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Test API] URL testée: http://192.168.68.205:4000/health
```

**✅ Si le test réussit** → Le problème vient d'un appel spécifique
**❌ Si le test échoue** → Problème de connexion générale

## 🔧 Solutions

### Solution 1 : Vérifier le fichier .env

Créer/modifier `.env` à la racine :

```env
EXPO_PUBLIC_API_URL=http://192.168.68.205:4000
```

**Important :** Pas de `/api/v1` dans l'URL !

### Solution 2 : Redémarrer avec cache vidé

```bash
npx expo start --clear --lan
```

### Solution 3 : Vérifier le firewall

Autoriser le port 4000 dans le firewall Windows ou désactiver temporairement pour tester.

### Solution 4 : Utiliser le mode tunnel (si LAN ne fonctionne pas)

```bash
npx expo start --tunnel
```

Plus lent mais fonctionne même si le réseau a des restrictions.

### Solution 5 : Vérifier que l'API écoute sur toutes les interfaces

Le serveur API doit écouter sur `0.0.0.0:4000` et non `127.0.0.1:4000` pour être accessible depuis le réseau.

## 📊 Logs à vérifier

### Logs de configuration (au démarrage)
```
[API Config] baseURL utilisé = http://192.168.68.205:4000
```

### Logs d'appel API
```
[API] 🔗 URL finale appelée: http://192.168.68.205:4000/partners
```

### Logs de test de connexion
```
[Test API] ✅ Réponse reçue en XXXms
```
ou
```
[Test API] ❌ Timeout - Le serveur ne répond pas
```

## 🚨 Erreurs courantes

### "Network request failed"
→ Le serveur n'est pas accessible depuis le téléphone
→ Vérifier WiFi, firewall, IP

### "Timeout exceeded"
→ Le serveur ne répond pas dans les 30 secondes
→ Vérifier que le serveur est démarré et répond

### URL contient "localhost"
→ La variable d'environnement n'est pas chargée
→ Redémarrer avec `--clear`

## 📞 Commandes de test rapide

```bash
# 1. Vérifier l'IP du PC
ipconfig | findstr IPv4

# 2. Tester depuis le PC
curl http://192.168.68.205:4000/health

# 3. Vérifier le port
netstat -ano | findstr :4000

# 4. Redémarrer Expo
npx expo start --clear --lan
```

