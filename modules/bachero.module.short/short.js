const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js")
const moreshort = require("moreshort")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.short")

// Répondre à une interaction en raccourcissant une URL
async function replyShortenUrl(interaction, url, provider, shortCode){
	// On defer l'interaction
	if(await interaction.deferReply({ ephemeral: !!interaction.guildId }).catch(err => { return "stop" }) == "stop") return

	// Si on a pas un provider, on obtient celui dans la BDD
	if(!provider){
		provider = await bacheroFunctions.database.get(database, `provider-${interaction.user.id}`)
		if(!provider) provider = "mdrr.fr"
	}

	// On vérifie si le provider sélectionné est valide
	if(!moreshort.servicesDomains.includes(provider)) return await interaction.editReply("Le service sélectionné n'est pas autorisé.").catch(err => {})

	// Raccourcir le lien
	var shortened = await moreshort.short(url, provider, shortCode).catch(err => err)

	// Si on a une erreur
	if(typeof shortened != "string") return await bacheroFunctions.report.createAndReply("raccourcir une URL", shortened.message || shortened, { url, provider, shortCode }, interaction)

	// Créer l'embed
	var embed = new EmbedBuilder()
		.setTitle("Résultat du raccourcissement")
		.setDescription(shortened)
		.setColor(bacheroFunctions.colors.primary)
		.setThumbnail(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURI(shortened?.url)}&size=192x192`)
		.setFooter({ text: `Sous la demande de ${interaction.user.discriminator == "0" ? interaction.user.username : interaction.user.tag}` })

	// Envoyer le message
	return await interaction.editReply({ embeds: [embed], ephemeral: !!interaction.guildId }).catch(err => {})
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("short")
		.setDescription("Raccourcir une URL")
		.addStringOption(option => option.setName("url")
			.setDescription("URL à raccourcir (si non spécifié, affiche un modal (si possible) ou raccourci le dernier message)")
			.setRequired(false)),

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le modal
	async interactionListener(listener){
		listener.on("modal", (interaction) => {
			// On vérifie l'id de l'interaction
			if(interaction.customId != "shorten-mainmodal") return

			// Si ça commence pas par https:// ou http://, on ajoute https://
			var url = interaction?.fields?.getTextInputValue("shorten-url")
			if(url && !url.startsWith("https://") && !url.startsWith("http://")) url = `https://${url}`

			// On répond à l'interaction
			replyShortenUrl(
				interaction,
				url,
				interaction?.fields?.getTextInputValue("shorten-provider"),
				interaction?.fields?.getTextInputValue("shorten-shortcode")
			)
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Si c'est une commande texte, tenter de supprimer le message d'invocation
		if(interaction.sourceType == "textCommand"){
			try { interaction.delete().catch(err => {}) } catch(err) {} // Le choix de la sécurité
		}

		// Obtenir le terme de recherche
		let query = interaction.options.getString("url")

		// Si on a pas de terme de recherche et qu'on utilise une commande texte
		if(!query && interaction.sourceType == "textCommand"){
			// Chercher le message auquel on répond
			if(interaction?.reference?.messageId){
				var repliedTo = await interaction.channel.messages.fetch(interaction.reference.messageId).catch(err => {})
				query = repliedTo.content
			}

			// Sinon, on prend le dernier message
			else {
				query = await interaction.channel.messages.fetch({ limit: 1, before: interaction.id }).catch(err => {})
				query = query.first()
				if(query) query = query?.content
			}
		}

		// Si on a un terme de recherche mais que c'est pas une URL
		if(query && !query.startsWith("https://") && !query.startsWith("http://")){
			// On utilise un regex pour trouver une URL dans le message
			let match = query.match(/(https?:\/\/[^\s]+)/)
			if(match) query = match[0]
			else query = undefined
		}

		// Si on a pas de terme de recherche et qu'on utilise une commande slash
		else if(!query && interaction.sourceType == "slashCommand"){
			return await interaction.showModal(new ModalBuilder()
				.setCustomId("shorten-mainmodal")
				.setTitle("Raccourcir une URL")
				.addComponents(
					new ActionRowBuilder().addComponents(new TextInputBuilder()
						.setCustomId("shorten-url")
						.setLabel("URL à raccourcir")
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true)
						.setMinLength(2)
						.setMaxLength(2000)),
					new ActionRowBuilder().addComponents(new TextInputBuilder()
						.setCustomId("shorten-shortcode")
						.setLabel("Code court (facultatif)")
						.setStyle(TextInputStyle.Short)
						.setRequired(false)
						.setMinLength(5)
						.setMaxLength(48)),
					new ActionRowBuilder().addComponents(new TextInputBuilder()
						.setCustomId("shorten-provider")
						.setLabel("Service (laisser vide pour celui par défaut)")
						.setStyle(TextInputStyle.Short)
						.setRequired(false)
						.setMinLength(1)
						.setMaxLength(48))
				)).catch(err => {})
		}

		// Si on a toujours pas de terme de recherche, on affiche une erreur
		if(!query) return interaction.reply("Pour utiliser cette commande, vous devez inclure l'argument `url` dans votre commande, ou :\n• Commande slash : utiliser le modal qui s'affiche lors de l'utilisation de la commande sans argument\n• Commande texte : répondre à un message contenant un lien").catch(err => {})
		if(!query.startsWith("https://") && !query.startsWith("http://")) return interaction.reply("L'URL obtenu ne semble pas être un lien valide.").catch(err => {})

		// Utiliser la fonction pour faire le reste
		return replyShortenUrl(interaction, query)
	}
}