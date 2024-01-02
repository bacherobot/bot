# Module Météo

Ce module permet d'obtenir la météo à une certaine position, via le nom de la ville, les coordonnées GPS ou une adresse IP (sera localisée approximativement).

Les informations suivantes seront affichées :

* La météo actuelle (texte et icône)
* L'heure locale
* Certaines températures (actuelle, ressentie, minimale, moyenne, maximale)
* Événements prévues dans la journée (pluie, neige)
* Précipitations, nuages, vent
* Lever/coucher du soleil et de la lune
* Prévisions par heures (à 7h, 12h, 15h, 18h, 21h)

## Clés d'APIs

> Les clés d'APIs doivent être stockées dans un fichier `.env` à la racine de Bachero, aux côtés d'[autres variables](https://bachero.johanstick.fr/docs/configuration/dotenv) nécessaires au bon fonctionnement du bot.

* `WEATHERAPI_KEY` (`string`) : requis pour utiliser le module, permet d'accéder à l'API de [WeatherAPI](https://www.weatherapi.com/).

### Installation / activation

Ce module est déjà préinstallé dans Bachero, vous n'avez aucune tâche à effectuer.

Pour désinstaller complètement ce module, vous pouvez supprimer le dossier `modules/bachero.module.weather`, vous pourrez ensuite recréer ce dossier et télécharger les fichiers depuis [GitHub](https://github.com/bacherobot/bot/tree/master/modules/bachero.module.weather) dans le cas où vous souhaitez utiliser à nouveau ce module.