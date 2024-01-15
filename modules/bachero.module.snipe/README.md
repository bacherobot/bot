# Fonctionnalité Snipe

Snipe est un module fait pour aider les modérateurs de serveurs à voir les différentes actions qu'un utilisateur a pu faire de manière anonyme, ou un autre modérateur.

Bachero est capable de détecter lorsqu'un message est modifié ou lorsqu'il est supprimé pour l'ajouter à une base de données non persistante. Cette base de données sera alors utilisée pour afficher ces messages quand un membre (ayant la permission de gérer les messages) utilise la commande `snipe`.

### Filtre de recherches

Pour aider les modérateurs à rechercher plus facilement les messages, et étant donné que seuls les 13 derniers snipes sont affichés en utilisant la commande, Bachero permet de filtrer les résultats affichés en utilisant des filtres de recherches dans les arguments de cette même commande.

Les arguments disponibles sont :
* `de` : pour n'afficher que les messages écrits par un utilisateur spécifique.
* `contient` : n'affiche que les messages contenant un lien ou un fichier.
* `query` : n'affiche que les messages contenant un ou plusieurs mots spécifiques.

Exemple : pour n'afficher que les snipes de l'utilisateur `@Bachero#0001`, et qui contiennent un fichier (tels qu'une image ou une vidéo), vous pouvez utiliser `snipe de: @Bachero#0001; contient: Attachement`.

### Hastebin

Discord empêche d'afficher un texte faisant plus de 1024 caractères pour le contenu d'un snipe affiché. Pour contourner ce problème, Bachero utilise Hastebin pour afficher le contenu d'un snipe trop long.

**Changer de serveur Hastebin :**

Par défaut, Bachero utilise le serveur d'Hastebin hébergé par Bachero (`https://haste.johanstick.fr`). Cependant, vous pouvez changer de serveur en modifiant la variable `HASTEBIN_URL` dans votre fichier .env.

> Si vous rencontrez des problèmes avec un serveur tiers, faites-le nous savoir en ouvrant une issue sur GitHub.  
> Sur les serveurs de [Toptal](https://www.toptal.com/developers/hastebin), il sera nécessaire d'utiliser la variable `HASTEBIN_TOKEN` pour ajouter une clé d'API.

**Désactiver l'utilisation d'Hastebin :**

Si ni la variable `HASTEBIN_TOKEN`, ni la variable `HASTEBIN_URL` n'est présente dans votre fichier .env, Bachero ne fera pas appel à Hastebin pour afficher les snipes trop longs, ceux-ci seront donc tronqués.

### Confidentialité

Bachero souhaite respecter au mieux votre vie privée, nous nous engageons à suivre les mesures suivantes :

* Les snipes sont enregistrés dans une base de données non persistante : ils seront supprimés à chaque redémarrage de l'infrastructure ou après 24 heures.
* Les messages qui ont été envoyés par un robot, ou par un compte utilisateur il y a plus de trois jours, ne seront pas enregistrés.
* La fonctionnalité est désactivée par défaut, et ne sera activée que si un membre avec la permission de gérer le serveur l'active manuellement.
* La désactivation de la fonctionnalité n'entraînera pas la suppression des snipes déjà enregistrée (pour éviter que certains modérateurs en abusent).
* Il est impossible pour n'importe qui de supprimer, ou de modifier un snipe déjà enregistré.
* Un modérateur n'est pas en mesure d'exporter l'ensemble des données présentes pour un serveur.
* Notre base de données n'inclut que 500 actions par serveurs, les plus anciennes seront supprimés au fur et à mesure.
* Les autres fonctionnalités du bot peuvent également enregistrer des actions qui peuvent être liées à un utilisateur, aucun rôle peut passer outre cette règle.
* Seules les informations suivantes sont enregistrées : l'identifiant de l'utilisateur ; le tag de l'auteur ; le contenu du message ; la date de création du snipe ; les attachements du message ; le type d'action.

> Important : une instance administrée par un tiers peut choisir de modifier le comportement de ce module, et donc de ne pas respecter ces engagements.

### Snipes de modules tiers

Les modules inclus dans Bachero, ainsi que les modules tiers, peuvent choisir d'ajouter leurs propres snipes pour aider la modération à comprendre l'utilisation de certaines commandes du bot.

**Utilisation dans vos modules :**

```js
const bacheroFunctions = require("../../functions")

bacheroFunctions.message.send("createSnipe", {
	guildId: interaction.guild.id, // id du serveur Discord auquel créer le snipe
	user: interaction.user, // utilisateur à l'origine du snipe (objet contenant `id`, `discriminator`, `username`, `tag` ou alors l'objet User de DiscordJS)
	type: "peut importe", // type d'action, affiché dans le titre du snipe
	content: `Déclenchement d'un truc grave chaud` // contenu du snipe, court (~ 1 ligne)
})
```

> Le module Snipe ajoutera l'entrée dans sa base de données sans répondre quoi que ce soit.  
> Si le module n'est pas présent ou n'est pas activé, la fonction ne renverra rien.

### Installation / activation

Ce module est déjà préinstallé dans Bachero, vous n'avez rien à faire apart l'activer sur votre serveur Discord en utilisant la commande `snipe-config`.

Pour désinstaller complètement ce module, vous pouvez supprimer le dossier `modules/bachero.module.snipe`, vous pourrez ensuite recréer ce dossier et télécharger les fichiers depuis [GitHub](https://github.com/bacherobot/bot/tree/master/modules/bachero.module.snipe) dans le cas où vous souhaitez utiliser à nouveau ce module.