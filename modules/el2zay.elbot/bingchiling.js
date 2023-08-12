const { SlashCommandBuilder } = require('discord.js')
var sayShowAuthor = bacheroFunctions.config.getValue('bachero.module.message', 'sayShowAuthor')
var botClient

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('bingchiling')
        .setDescription('Commande la commande say mais avec des caractères chinois.')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Le message à bingchiling.')
                .setRequired(true)),

    async execute(interaction) {
        var chineseChar = "丹书匚刀巳下呂廾工丿片乚爪冂口尸Q尺丂丁凵V山乂Y乙"
        var chineseChar = {
            "a": "丹",
            "b": "书",
            "c": "匚",
            "d": "刀",
            "e": "巳",
            "f": "下",
            "g": "呂",
            "h": "廾",
            "i": "工",
            "j": "丿",
            "k": "片",
            "l": "乚",
            "m": "爪",
            "n": "冂",
            "o": "口",
            "p": "尸",
            "q": "Q",
            "r": "尺",
            "s": "丂",
            "t": "丁",
            "u": "凵",
            "v": "V",
            "w": "山",
            "x": "乂",
            "y": "Y",
            "z": "乙",

        }

        let chineseText = interaction.options.getString('message');

        for ([key, value] of Object.entries(chineseChar)) {
            chineseText = chineseText.replaceAll(key, value);
        }

        // Mettre la réponse en defer
        if (interaction.sourceType !== 'textCommand' && await interaction.deferReply({ ephemeral: true }).catch(err => { return 'stop' }) == 'stop') return

        // Rajouter l'auteur
        if (sayShowAuthor) chineseText = `\`${interaction.user.discriminator == '0' ? escape(interaction.user.username) : escape(interaction.user.tag)}\`\n${chineseText}`

        // Vérifier sa taille
        if (chineseText.length > 1999) return interaction.editReply({ content: 'Votre message dépasse la limite de caractère (2000 caractères)' }).catch(err => { })

        // Obtenir l'attachement
        var attachment = await interaction.options.getAttachment('attachment')
        if (attachment) attachment = new AttachmentBuilder(attachment.url)

        // Obtenir le client du bot
        if (!botClient) botClient = bacheroFunctions.botClient.get()

        // Finir l'exécution
        try {
            // Envoyer le message
            var messageOption = { content: chineseText }
            if (attachment) messageOption.files = [attachment]
            botClient.channels.cache.get(interaction.channelId).send(messageOption)


            // Répondre à l'interaction
            if (interaction.sourceType !== 'textCommand') interaction.editReply({ content: `Message envoyé !\n> **Tips : ** Personne ne sait que vous êtes l'auteur de cette commande 🤫` }).catch(err => { })
        } catch (err) {
            return await bacheroFunctions.report.createAndReply("envoi du msesage", err, {}, interaction)
        }

        // Si c'est une commande texte, tenter de supprimer le message d'invocation
        if (interaction.sourceType == 'textCommand') {
            try { interaction.delete().catch(err => { }) } catch (err) { } // Le choix de la sécurité
        }


        // Envoyer le message
        interaction.reply(chineseText.join(' ')).catch(err => { })
    }
}
