const { SlashCommandBuilder, AttachmentBuilder, escapeMarkdown } = require("discord.js")
const bacheroFunctions = require("../../functions")
var sayShowAuthor = bacheroFunctions.config.getValue("bachero.module.message", "sayShowAuthor")
var botClient

// Liste des caractères
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
	"z": "乙"
}

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("bingchiling")
		.setDescription("Fait dire au bot un message, mais avec des caractères chinois")
		.addStringOption(option => option
			.setName("message")
			.setDescription("Le message à bingchiling-isé")
			.setMaxLength(1999)
			.setRequired(true))
		.addAttachmentOption(option => option.setName("attachment")
			.setDescription("Permet d'ajouter un attachement au message")
			.setRequired(false)),

	async execute(interaction){
		// On détermine le texte
		let text = interaction.options.getString("message").toLowerCase()
		for(var [key, value] of Object.entries(chineseChar)){
			text = text.replaceAll(key, value)
		}

		// Mettre la réponse en defer
		if(interaction.sourceType !== "textCommand" && await interaction.deferReply({ ephemeral: true }).catch(err => { return "stop" }) == "stop") return

		// Rajouter l'auteur
		if(sayShowAuthor) text = `\`${interaction.user.discriminator == "0" ? escapeMarkdown(interaction.user.username) : escapeMarkdown(interaction.user.tag)}\`\n${text}`

		// Vérifier sa taille
		if(text.length > 1999) return interaction.editReply({ content: "Votre message dépasse la limite de caractère (2000 caractères)" }).catch(err => {})

		// Obtenir l'attachement
		var attachment = await interaction.options.getAttachment("attachment")
		if (attachment) attachment = new AttachmentBuilder(attachment.url)

		// Obtenir le client du bot
		if (!botClient) botClient = bacheroFunctions.botClient.get()

		// Envoyer le message et répondre à l'interaction
		try {
			// Envoyer le message
			var messageOption = { content: text }
			if (attachment) messageOption.files = [attachment]
			botClient.channels.cache.get(interaction.channelId).send(messageOption).catch(err => {})

			// Répondre à l'interaction
			if (interaction.sourceType !== "textCommand") interaction.editReply({ content: `Message envoyé !\n> **Tips : ** ${sayShowAuthor ? "On est pas raciste 🔥🔥" : "尸巳尺丂口冂冂巳 冂巳 丂丹工丁 Q凵巳 V口凵丂 巳丁巳丂 乚'丹凵丁巳凵尺 刀巳 匚巳丁丁巳 匚口爪爪丹冂刀巳 🤫"}` }).catch(err => {})
		} catch (err) {
			return await bacheroFunctions.report.createAndReply("envoi du message", err, { content: text, hasAttachment: !!attachment }, interaction)
		}

		// Si c'est une commande texte, tenter de supprimer le message d'invocation
		if (interaction.sourceType == "textCommand") {
			try { interaction.delete().catch(err => {}) } catch (err) { } // Le choix de la sécurité
		}
	}
}
