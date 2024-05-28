# Statistiques de jeux

Un module Bachero vous permettant d'afficher des statistiques sur un compte de différentes plateformes en rapport avec les jeux vidéo.

### Services supportés

* [MonkeyType](https://monkeytype.com/)
* Clash Royale
* Brawl Stars
* Clash of Clans
* [Paladium](https://paladium-pvp.fr/)

### Clés d'APIs

> Les clés d'APIs doivent être stockées dans un fichier `.env` à la racine de Bachero, aux côtés d'[autres variables](https://bachero.johanstick.fr/docs/configuration/dotenv) nécessaires au bon fonctionnement du bot.

* `CLASHROYALE_API_KEY` (`string`)
* `BRAWLSTARS_API_KEY` (`string`)
* `CLASHOFCLANS_API_KEY` (`string`)

### Créer une clé d'API pour les plateformes Supercell

Pour accéder aux données des jeux Supercell, vous aurez besoin d'une clé d'API sur chacun des jeux. Il existe deux méthodes pour obtenir ces clés :

**Méthode 1 :**

- Ouvrez un terminal et entrez la commande `npx supercell-api-generator`.
- Lors de la première utilisation, valider avec `y` et patienter pendant le téléchargement.
- Sélectionner les jeux pour lesquels vous souhaitez obtenir une clé d'API avec espace ainsi que les flèches de votre clavier, valider avec entrer.
- Inscrivez l'[adresse IP publique](https://api.ipify.org) utilisée par le serveur hébergeant Bachero. Supercell restreint l'accès à l'API à cette adresse IP.
- Patienter pendant que vos comptes se génèrent automatiquement, les clés d'APIs seront affichées en temps réel dans le terminal.
- Lorsque tout est terminé, fermer le terminal ou utiliser `Ctrl + C` pour arrêter le processus.

> Note : cette méthode est la plus simple mais n'est pas autorisée par Supercell et pourrait être bloquée à tout moment.

**Méthode 2 :**

- Ouvrez un navigateur et ouvrez la documentation de l'API d'un des jeux : [Clash Royale](https://developer.clashroyale.com), [Brawl Stars](https://developer.brawlstars.com), [Clash of Clans](https://developer.clashofclans.com).
- En haut à droite, cliquez sur "Register" pour vous inscrire.
- Entrer un pseudo et une adresse email valide.
- Confirmer votre adresse email en cliquant sur le lien reçu.
- Finaliser la création du compte en entrant un mot de passe, puis connectez-vous.
- En haut à droite, cliquer sur votre nom d'utilisateur puis sur "My Account".
- Dans la section "My Keys", cliquer sur "Create New Key" pour générer une nouvelle clé d'API.
- Entrez un nom, une description (peu importe) et saississez l'[adresse IP publique](https://api.ipify.org) utilisée par le serveur hébergeant Bachero.
- Valider en cliquant sur "Create Key", la clé d'API sera affichée et vous pourrez la copier.
- Répéter cette méthode pour chaque jeu.

### Installation / activation

Ce module est déjà préinstallé dans Bachero, vous n'avez aucune tâche à effectuer.

Pour désinstaller complètement ce module, vous pouvez supprimer le dossier `modules/bachero.module.gamestats`, vous pourrez ensuite recréer ce dossier et télécharger les fichiers depuis [GitHub](https://github.com/bacherobot/bot/tree/master/modules/bachero.module.gamestats) dans le cas où vous souhaitez utiliser à nouveau ce module.