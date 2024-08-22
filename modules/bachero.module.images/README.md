# Générations d'images

Un module Bachero capable de générer des images personnalisées à partir de commandes, en utilisant des APIs externes ou un moteur de rendu WEB via une page rendue localement. Il ne s'agit pas d'un module de génération d'images avec IA.

### Disclaimer

**1.** Sur certaines infrastructures, l'installation de [Puppeteer](https://pptr.dev/) (rendu web) peut être compliquée. Si vous rencontrez des problèmes, vous pouvez désactiver ce module en suivant les étapes dans la section dédiée : cela n'aura aucune influence sur le reste de votre instance Bachero.  
**2.** Les appels au moteur de rendu WEB se font localement, via un navigateur automatisé et sans interface graphique, aucune fenêtre ne s'affichera sur la machine hôte.  
**3.** La commande `faketweet` peut afficher un filigrane sur l'image générée avec certains comptes. Cette restriction a été mis en place afin d'éviter des potentielles utilisations malveillantes.  

### Installation / activation

Ce module est déjà préinstallé dans Bachero, vous pouvez ouvrir le fichier manifest.jsonc présent dans `modules/bachero.module.images` et définir la valeur `disabled` sur `false` pour l'activer.

Pour désinstaller complètement ce module, vous pouvez supprimer le dossier `modules/bachero.module.images`, vous pourrez ensuite recréer ce dossier et télécharger les fichiers depuis [GitHub](https://github.com/bacherobot/bot/tree/master/modules/bachero.module.images) dans le cas où vous souhaitez utiliser à nouveau ce module.