# 📝 Configuration du fichier .env

## ✅ Fichier .env créé

Le fichier `.env` a été créé avec la configuration par défaut.

## 📋 Contenu du fichier .env

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

## 🔧 Modifications selon l'environnement

### Pour Android Emulator
```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

### Pour iOS Simulator
```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

### Pour appareil physique (remplacez XXX par votre IP locale)
```env
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:4000
```

Pour trouver votre IP locale :
- **Windows** : `ipconfig` (cherchez "IPv4 Address")
- **Mac/Linux** : `ifconfig` ou `ip addr`

### Pour ngrok
```env
EXPO_PUBLIC_API_URL=https://xxxx-xx-xx-xx-xx.ngrok.io
```

### Pour la production
```env
EXPO_PUBLIC_API_URL=https://api.kashup.com
```

## ⚠️ Important

- Le fichier `.env` est déjà dans `.gitignore` (ne sera pas commité)
- Redémarrez l'application Expo après modification du `.env`
- Utilisez `npx expo start --clear` pour forcer le rechargement

