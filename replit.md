# Telegram Auto-Followup Bot

## Overview
Bot Telegram automatisé avec système de relances, envoi de vidéos et gestion d'accès VIP. Le bot guide les utilisateurs à travers un parcours de conversion avec des témoignages vidéo, des relances temporisées, et un système de déblocage d'accès aux canaux VIP.

## Recent Changes (October 14, 2025)
- ✅ Projet importé de GitHub et configuré pour Replit
- ✅ Ajout de boutons de clavier personnalisés :
  - "🔓 Débloquer mon accès au VIP" : Demande de rejoindre les canaux avec vérification
  - "🎯 Accéder au hack" : Accès aux bots après vérification des canaux
- ✅ Système de vérification des canaux avec bouton "Check"
- ✅ Interface de boutons inline pour les canaux et les bots
- ✅ Configuration du workflow Replit
- ✅ Création du fichier .env.example avec toutes les variables

## Project Architecture

### Technologies
- **Backend**: Node.js (v20)
- **Framework Bot**: node-telegram-bot-api
- **Database**: MongoDB (externe via MongoDB Atlas ou autre)
- **Scheduling**: node-schedule
- **Configuration**: dotenv

### Structure des fichiers
```
/
├── bot.js              # Fichier principal du bot
├── models/
│   └── User.js         # Modèle MongoDB pour les utilisateurs
├── package.json        # Dépendances npm
├── .env.example        # Template des variables d'environnement
└── .gitignore         # Fichiers à ignorer par Git
```

### Modèle de données (User)
- `chatId`: ID Telegram de l'utilisateur (unique)
- `firstName`: Prénom de l'utilisateur
- `username`: Nom d'utilisateur Telegram
- `currentStage`: Étape actuelle du parcours
- `hasResponded`: A répondu ou non
- `responseType`: Type de réponse (positive/negative/none)
- `vipUnlocked`: Accès VIP débloqué
- `channelsJoined`: Canaux vérifiés
- `linkSent`: Lien d'inscription envoyé
- `linkSentAt`: Date d'envoi du lien

### Flux utilisateur
1. **Commande /start** → Envoi vidéo de démarrage + 5 témoignages
2. **Question initiale** → "Voulez-vous gagner avec nous ?"
3. **Bouton "Débloquer VIP"** → Affichage des canaux à rejoindre
4. **Vérification canaux** → Bouton "Check" pour valider
5. **Bouton "Accéder au hack"** → Accès aux bots (Apple F, Kami, Crash)
6. **Relances automatiques** :
   - Relance 1 : après 5 minutes
   - Relance 2 : après 30 minutes
   - Relance 3 : après 12 heures (avec 4 vidéos finales)

### Commandes admin
- `/stats` : Statistiques du bot (utilisateurs, conversions, etc.)
- `/broadcast [message]` : Envoyer un message à tous les utilisateurs

## Environment Variables

### Variables obligatoires
Voir le fichier `.env.example` pour la liste complète. Principales variables :

**Configuration Telegram :**
- `TELEGRAM_BOT_TOKEN` : Token du bot (@BotFather)
- `ADMIN_TELEGRAM_ID` : ID Telegram de l'admin
- `ADMIN_USERNAME` : Username Telegram de l'admin

**Base de données :**
- `MONGODB_URI` : URI de connexion MongoDB

**Vidéos :**
- `VIDEO_START` : Vidéo de démarrage
- `VIDEO_TEMOIGNAGE_1` à `VIDEO_TEMOIGNAGE_5` : Vidéos de témoignages
- `VIDEO_FINAL_7` à `VIDEO_FINAL_10` : Vidéos finales

**Liens :**
- `LINK_REGISTER` : Lien d'inscription
- `CHANNEL_VIP`, `CHANNEL_1` à `CHANNEL_4` : Liens des canaux
- `BOT_APPLE_F`, `BOT_KAMI`, `BOT_CRASH` : Liens des bots

## Setup Instructions

1. **Configurer les secrets** : Ajouter toutes les variables d'environnement dans les Secrets Replit
2. **Vérifier MongoDB** : S'assurer que la base de données MongoDB est accessible
3. **Démarrer le bot** : Le workflow "Telegram Bot" démarre automatiquement
4. **Tester** : Envoyer /start au bot sur Telegram

## Notes techniques
- Le bot utilise le polling Telegram (pas de webhook)
- Un serveur HTTP keep-alive tourne sur le port 3000
- Les relances sont gérées avec setTimeout (pas node-schedule actuellement)
- **Vérification des canaux** : Le bot utilise l'API Telegram getChatMember pour vérifier si l'utilisateur a rejoint les canaux
  - Le bot doit être **administrateur** dans les canaux pour pouvoir vérifier les membres
  - Configurez les IDs des canaux (format: @username ou -100XXXXXXXXXX) dans les variables CHANNEL_*_ID
  - Si aucun ID n'est configuré, la vérification est automatiquement validée

## Maintenance
- Les logs sont visibles dans la console Replit
- Notifications admin pour chaque conversion importante
- Les erreurs MongoDB/Telegram sont loggées dans la console
