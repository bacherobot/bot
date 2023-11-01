const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const fetch = require("node-fetch")
const database = bacheroFunctions.database.getDatabase("bachero.module.short")
const providersList = ["is.gd", "v.gd", "s.oriondev.fr", "s.3vm.cl", "s.ahpc.fi", "s.acme.si", "s.3play.cl", "s.fronturi.ro", "shor.vercel.app"]

// Raccourcir une URL
async function shortenUrl(url, provider, shortCode){
	// On ajoute soi-même https:// au début de l'URL s'il le faut
	if(!url) return { success: false, message: "Aucune URL spécifiée." }
	if(!url.startsWith("http://") && !url.startsWith("https://")) url = `https://${url}`

	// Pour Quecto
	if(provider === "s.oriondev.fr"){
		var result = await fetch("https://s.oriondev.fr/api/shorten", {
			method: "POST",
			body: new URLSearchParams({ link: url, custom_code: shortCode || "" })
		}).then(res => res.json()).catch(err => { return { fetcherror: err } })

		if(result?.fetcherror || result?.status !== 200) return { success: false, message: result?.data || result?.fetcherror || result }
		else return { success: true, url: result.data.shorten }
	}

	// Pour is.gd/v.gd
	if(provider === "is.gd" || provider === "v.gd"){
		var result = await fetch(`https://${provider}/create.php`, {
			method: "POST",
			body: new URLSearchParams({ url: url, format: "json", shorturl: shortCode || "" })
		}).then(res => res.json()).catch(err => { return { fetcherror: err } })

		if(result?.fetcherror || result?.errormessage || result?.errorcode) return { success: false, message: result?.errormessage || result?.fetcherror || result }
		else return { success: true, url: result.shorturl }
	}

	// Pour les autres
	else {
		var result = await fetch(`https://${provider}/create`, {
			method: "POST",
			body: JSON.stringify({ url: url, shorturl: shortCode || "" })
		}).then(res => res.json()).catch(err => { return { fetcherror: err } })

		if(result?.fetcherror || result?.message || result?.error) return { success: false, message: result?.fetcherror || result?.message || result?.error }
		else return { success: true, url: `https://${result.domain}/${result.shorturl}` }
	}
}

// Répondre à une interaction en raccourcissant une URL
async function replyShortenUrl(interaction, url, provider, shortCode){
	// On defer l'interaction
	if(await interaction.deferReply({ ephemeral: !!interaction.guildId }).catch(err => { return "stop" }) == "stop") return

	// Si on a pas un provider, on obtient celui dans la BDD
	if(!provider){
		provider = await bacheroFunctions.database.get(database, `provider-${interaction.user.id}`)
		if(!provider) provider = "is.gd"
	}

	// On vérifie si le provider sélectionné est valide
	if(!providersList.includes(provider)) return await interaction.editReply("Le service sélectionné n'est pas autorisé.").catch(err => {})

	// Raccourcir le lien
	let shortened = await shortenUrl(url, provider, shortCode)

	// Si on a une erreur
	if(!shortened.success) return await bacheroFunctions.report.createAndReply("requête vers l'API pour raccourcir une URL", shortened.message || shortened, {}, interaction)

	// Créer l'embed
	var embed = new EmbedBuilder()
		.setTitle("Résultat du raccourcissement")
		.setDescription(shortened?.url || shortened)
		.setColor(bacheroFunctions.colors.primary)
		.setThumbnail(`https://chart.googleapis.com/chart?cht=qr&chld=L|1&chs=256x256&chl=${encodeURI(shortened?.url)}`)
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