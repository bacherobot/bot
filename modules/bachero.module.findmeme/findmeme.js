const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, escapeMarkdown } = require("discord.js")
const fetch = require("node-fetch")
const bacheroFunctions = require("../../functions")

// Cache
var cache
if(global.findmemeCache) cache = global.findmemeCache
else {
	const NodeCache = require("node-cache")
	cache = new NodeCache()
	global.findmemeCache = cache
}

// Obtenir la liste des memes
async function getMemes(){
	if(cache.has("memes")) return cache.get("memes")

	var memes = await fetch("https://findmeme-api.vercel.app/allMemes.json").then(res => res.text()).catch(err => { return { message: err?.message || err } })

	if(!memes?.message){
		try {
			memes = JSON.parse(memes)
			cache.set("memes", memes, 60 * 60) // 1 heure
		} catch(err){
			return { message: err?.message || err }
		}
	}

	return memes
}

// Fonction pour répondre à une interaction avec les infos d'un meme
async function replyWithMemeInfo(meme, interaction, ephemeral = false){
	// Créer un embed
	var embed = new EmbedBuilder()
		.setTitle(meme.name)
		.setDescription(`${escapeMarkdown(meme.description)}\n\n> Date d'ajout : <t:${Math.round(new Date(meme?.date).getTime() / 1000)}:d>${meme?.tag ? (`\n> Tag : ${meme.tag.replace("snapchat", "Snapchat").replace("equipe", "L'équipe").replace("tk78", "The Kairi").replace("twittos_streamer", "Twittos/Streamer")}`) : ""}\n> Mots clés : ${(meme?.keywords?.length ? meme.keywords : ["Aucun"]).join(" ; ")}`.substring(0, 2048))
		.setColor(bacheroFunctions.colors.primary)
		.setFooter({ text: `Sous la demande de ${interaction.user.discriminator == "0" ? interaction.user.username : interaction.user.tag}` })

	// Ajouter le meme
	if(!meme.name.endsWith(".mp4")) embed.setImage(meme.url) // Image --> on met l'image dans l'embed
	else var attachment = new AttachmentBuilder(meme.url) // Vidéo --> on créé un attachement

	// Ajouter un bouton pour voir la page
	var row = new ActionRowBuilder().addComponents(new ButtonBuilder()
		.setURL(`https://findmeme.johanstick.fr/#memeInfo-${encodeURI(meme.name)}`)
		.setStyle(ButtonStyle.Link)
		.setLabel("Visiter la page complète"))

	// Répondre
	if(ephemeral && interaction.sourceType != "textCommand"){
		await interaction.editReply("Les informations seront affichés dans un autre message.").catch(err => {}) // on envoie une réponse finale, pour pouvoir ensuite followUp sans être ephémère, tout le monde pourra voir le msg
		return await interaction.followUp({ embeds: [embed], components: [row], files: attachment ? [attachment] : [] }).catch(err => {})
	}
	else return interaction.editReply({ embeds: [embed], components: [row], files: attachment ? [attachment] : [] }).catch(err => {})
}

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("findmeme")
		.setDescription("Recherche des memes français via le service FindMeme")
		.addStringOption(option => option.setName("search")
			.setDescription("Terme de recherche")
			.setMaxLength(200)
			.setRequired(false)),

	// Récupérer le listener et savoir lorsque quelqu'un fait quelque chose
	async interactionListener(listener){
		// Pour les select menu
		listener.on("selectMenu", async (interaction) => {
			// Vérifier l'id
			if(interaction.customId != "findmeme-select") return

			// Vérifier l'auteur puis defer l'interaction
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})

			// Mettre la réponse en defer
			if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

			// Obtenir la liste des memes
			var memes = await getMemes()
			if(memes?.message) return await bacheroFunctions.report.createAndReply("obtention des memes après recherche", memes?.message || memes, {}, interaction)

			// Obtenir le meme sélectionné
			var selectedMeme = memes.memes.find(m => m.name.substring(0, 99) == interaction.values[0])
			if(!selectedMeme) return interaction.editReply({ content: "Impossible de trouver le meme sélectionné... La liste en cache n'est sûrement pas à jour. Réessayer plus tard.", ephemeral: true }).catch(err => {})

			// Appeler la fonction qui gère l'affichage des infos
			return replyWithMemeInfo(selectedMeme, interaction, false)
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply({ ephemeral: true }).catch(err => { return "stop" }) == "stop") return

		// Obtenir le terme de recherche
		var query = interaction.options.getString("search")

		// Si on a pas de terme de recherche
		if(!query){
			// Obtenir et vérifier les memes
			var memes = await getMemes()
			if(memes?.message) return await bacheroFunctions.report.createAndReply("obtention des memes", memes?.message || memes, { query }, interaction)
			else memes = memes?.memes || []

			// Obtenir 25 memes aléatoires
			var randomMemes = []
			for(var i = 0; i < 25; i++){
				var randomMeme = memes[Math.floor(Math.random() * memes.length)]
				if(!randomMemes.includes(randomMeme)) randomMemes.push(randomMeme)
				else i--
			}

			// Créer les options
			var options = randomMemes.map((r, i) => new StringSelectMenuOptionBuilder()
				.setLabel(r.name.substring(0, 99))
				.setValue(r.name.substring(0, 99))
				.setDescription(r.description.substring(0, 99)))

			// Créer le select
			var select = new StringSelectMenuBuilder()
				.setCustomId("findmeme-select")
				.setPlaceholder("Proposition de memes aléatoires")
				.addOptions(options)

			// Créer l'action row
			var actionRow = new ActionRowBuilder().addComponents(select)

			// Répondre
			return interaction.editReply({ components: [actionRow] }).catch(err => {})
		}

		// Si on veut récupérer les infos des memes
		else if(query == "info"){
			// Obtenir et vérifier les memes
			var memes = await getMemes()
			if(memes?.message) return await bacheroFunctions.report.createAndReply("obtention des memes", memes?.message || memes, { query }, interaction)
			var attributes = memes?.attributes || {}
			memes = memes?.memes || []

			// Créer un embed
			var embed = new EmbedBuilder()
				.setTitle("Infos sur la base FindMeme")
				.setDescription(`**Statistiques :**\n• Vidéos : ${memes.filter(m => m.name.endsWith(".mp4")).length}\n• Images : ${memes.filter(m => m.name.endsWith(".jpg") || m.name.endsWith(".jpeg") || m.name.endsWith(".png")).length}\n• ${memes.length} éléments\n\n**Attributs :**\n• Dernière MÀJ : <t:${Math.round(new Date(attributes?.generatedOn).getTime() / 1000)}:d>\n• Source : [FindMeme](https://findmeme.johanstick.fr/)\n\n> Toute demande ou réclamation peut être faite en [me contactant](https://johanstick.fr/#contact).`)
				.setColor(bacheroFunctions.colors.primary)

			// Répondre
			return interaction.editReply({ embeds: [embed] }).catch(err => {})
		}

		// Si on a un terme de recherche
		else {
			// Faire une recherche
			var searchResult = await fetch(`https://findmeme-api.vercel.app/search?maxResults=20&query=${encodeURI(query)}`).then(res => res.text()).catch(err => { return { message: err?.message || err } })

			// On parse en JSON
			if(!searchResult?.message){
				try {
					searchResult = JSON.parse(searchResult)
				} catch(err){
					searchResult = { message: err?.message || err }
				}
			}

			// Vérifier si on a une erreur
			if(searchResult?.message) return await bacheroFunctions.report.createAndReply("recherche de meme", searchResult?.message || searchResult, { query }, interaction)

			// Si on a aucun résultat
			if(!searchResult?.length) return interaction.editReply("Aucun résultat n'a pu être trouvé pour ce terme de recherche.").catch(err => {})

			// Si on a plusieurs résultats, on fait un select
			if(searchResult.length > 1){
				// Créer les options
				var options = searchResult.map((r, i) => new StringSelectMenuOptionBuilder()
					.setLabel(r.name.substring(0, 99))
					.setValue(r.name.substring(0, 99))
					.setDescription(r.description.substring(0, 99)))

				// Créer le select
				var select = new StringSelectMenuBuilder()
					.setCustomId("findmeme-select")
					.setPlaceholder("Sélectionnez un meme")
					.addOptions(options)

				// Créer l'action row
				var actionRow = new ActionRowBuilder().addComponents(select)

				// Répondre
				return interaction.editReply({ components: [actionRow] }).catch(err => {})
			}

			// Si on a un seul résultat, on appelle la fonction qui gère l'affichage des infos
			else return replyWithMemeInfo(searchResult[0], interaction, true)
		}
	}
}