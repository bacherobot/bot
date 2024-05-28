# AutoLink

AutoLink est un module fait pour éviter aux membres de votre serveur de devoir cliquer sur des liens lorsqu'un message en contient beaucoup.

Lorsqu'un utilisateur envoie un ou plusieurs liens, ceux-ci seront extraits et des informations seront récupérées lorsqu'ils sont supportés, Bachero enverra ensuite un message qui contient les informations obtenues.

> Note : les liens qui utilisent un raccourcisseur d'URLs ne seront pas détectés.

### Disclaimer

**1.** Ce module peut engendrer des risques de sécurité sur votre serveur Discord, il est désactivé par défaut mais vous pouvez forcer son activation avec la commande `autolink-config`.  
**2.** Des utilisateurs peuvent abuser de cette fonctionnalité pour en faire bloquer l'accès aux APIs utilisés pour les services de détections, ce module est donc désactivé sans possibilité de l'activer sur l'instance publique de Bachero. Vous pouvez configurer votre propre instance de Bachero pour l'utiliser.

### Fonctionnalités et sites supportés

* NPMJS (package)
* GitHub (repository, issues, pull request, utilisateur/organisation, gists)
	* Vous pouvez ajouter une clé d'API (`AUTOLINK_GITHUB_TOKEN`) dans votre fichier .env pour augmenter le nombre de requêtes autorisées : https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
* Fichiers partagés avec Stend
	* Par défaut, seule l'instance "stend.johanstick.fr" est supportée, vous pouvez ajouter d'autres instances dans le fichier de configuration de ce module.
	* Le format dans la configuration est le suivant : `"<domaine ou sous domaine du client web>": "<url de l'API sans slash à la fin>"`
	* Les issues et pull requests visant à ajouter d'autres instances seront refusées pour éviter des fuites d'IPs.

> Vous pouvez proposer d'autres sites à ajouter dans la liste en créant une issue, ou en modifiant le code source et en faisant une pull request.

### Installation / activation

Ce module est déjà préinstallé dans Bachero, vous pouvez ouvrir le fichier manifest.jsonc présent dans `modules/bachero.module.autolink` et définir la valeur `disabled` sur `false` pour l'activer.

Pour désinstaller complètement ce module, vous pouvez supprimer le dossier `modules/bachero.module.autolink`, vous pourrez ensuite recréer ce dossier et télécharger les fichiers depuis [GitHub](https://github.com/bacherobot/bot/tree/master/modules/bachero.module.autolink) dans le cas où vous souhaitez utiliser à nouveau ce module.