# Module elbot

![Elbot et BC qui se serrent la main](https://github.com/el2zay/bachero/assets/79168733/b11f40bd-c200-4a1d-bf8a-992761387e51)

## Description

Ce module contient plusieurs commandes qui ont été développées pour le bot elbot. Elbot a été arrêté depuis un bout de temps, mais désormais, il est de retour sur Bachero.

De futures commandes qui n'étaient que des idées pour elbot, arrivent sur Bachero.

## Information

Le repo [el2zay/elbot](https://github.com/el2zay/elbot) est désormais archivé, le code est assez ancien et pas très optimisé. Cette version est une version recodée et réadaptée pour DiscordJS pour qu'elbot soit le plus optimisé possible.

## Clés d'APIs

> Les clés d'APIs doivent être stockées dans un fichier `.env` à la racine de Bachero, aux côtés d'[autres variables](https://bachero.johanstick.fr/docs/configuration/dotenv) nécessaires au bon fonctionnement du bot.

**Commande /random-map-point (random-map-point.js) :**

* `OPENCAGE_API_KEY` (`string`) : requise pour afficher le nom de la rue des coordonnées indiqués par la commande. La génération et la prévisualisation de la carte fonctionnent sans clé. Vous pouvez en obtenir une gratuitement sur [OpenCage](https://opencagedata.com/api#quickstart).

**Commande /removebg (removebg.js) :**

* `REMOVEBG_TOKENS` (`array`) : requise pour faire fonctionner la commande, celle-ci sera désactivée si aucune clés n'est disponible. Vous pouvez en obtenir une gratuitement sur [remove.bg](https://www.remove.bg/fr/tools-api). Il est possible d'utiliser plusieurs clés, le format suivant doit être respecté : `["clé1", "clé2", "clé3"]` (même pour une seule clé). La commande utilisera la première clé disponible, si celle-ci ne fonctionne pas, elle passera à la suivante, et ainsi de suite.