const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const fetch = require("node-fetch")
const escape = require("markdown-escape")

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("unshort")
		.setDescription("Obtient l'URL originale d'un lien raccourci")
		.addStringOption(option => option.setName("url")
			.setDescription("URL à déracourcir (si non spécifié, le bot va déracourcir le dernier message ou celui en réponse)")
			.setRequired(false)),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply({ ephemeral: !!interaction.guildId }).catch(err => { return "stop" }) == "stop") return

		// Si c'est une commande texte, tenter de supprimer le message d'invocation
		if(interaction.sourceType == "textCommand"){
			try { interaction.delete().catch(err => {}) } catch(err) {} // Le choix de la sécurité
		}

		// Obtenir le terme de recherche
		var query = interaction.options.getString("url")

		// Si on a pas de terme de recherche, on va chercher le dernier message ou celui en réponse
		if(!query){
			// Chercher le message auquel on répond
			if(interaction?.reference?.messageId){
				var repliedTo = await interaction.channel.messages.fetch(interaction.reference.messageId).catch(err => {})
				query = repliedTo?.content
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

		// Si on a toujours pas de terme de recherche, on affiche une erreur
		if(!query) return interaction.editReply("Pour utiliser cette commande, vous devez inclure l'argument `url` dans votre commande, ou : répondre à un message contenant un lien (ne fonctionne pas via les commandes slash).").catch(err => {})
		if(!query.includes("https://") && !query.includes("http://")) return interaction.editReply("L'URL obtenu ne semble pas être un lien valide.").catch(err => {})

		// Obtenir l'URL originale
		var unshortened = await fetch("https://unshort-api.vercel.app", { method: "POST", body: JSON.stringify({ link: query }), headers: { "User-Agent": "BacheroBot (+https://github.com/bacherobot/bot)" } }).then(res => res.json()).catch(err => { return { fetcherror: err } })

		// Si on a une erreur
		if(unshortened.fetcherror) return await bacheroFunctions.report.createAndReply("requête vers l'API d'Unshort", unshortened.fetcherror || unshortened.error || unshortened.message, {}, interaction)
		else if(unshortened.error || unshortened.statusCode) return interaction.editReply(unshortened.message || unshortened.error || unshortened.statusCode).catch(err => {})

		// Obtenir les métadonnées
		var meta_title = unshortened?.metadata?.find(a => a.name == "title")?.content
		var meta_description = unshortened?.metadata?.find(a => a.name == "description")?.content
		var meta_image = unshortened?.metadata?.find(a => a.name == "image")?.content

		// Créer l'embed
		var embed = new EmbedBuilder()
			.setTitle("Résultat de l'analyse")
			.addFields([
				{ name: "Raccourci", value: unshortened.url || query, inline: true },
				{ name: "Originale", value: unshortened.redirected, inline: true },
				meta_title ? { name: "Titre", value: escape(meta_title) || "Aucun titre trouvé", inline: true } : undefined,
				meta_description ? { name: "Description", value: escape(meta_description) || "Aucune description trouvée", inline: true } : undefined,
			].filter(Boolean))
			.setColor(unshortened.safe ? bacheroFunctions.colors.primary : bacheroFunctions.colors.secondary)
			.setFooter({ text: `Sous la demande de ${interaction.user.discriminator == "0" ? interaction.user.username : interaction.user.tag}` })

		// Ajouter quelques éléments
		if(!unshortened.safe) embed.setDescription("⚠️ La [navigation sécurisée](https://transparencyreport.google.com/safe-browsing/search) de Google a détecté que le lien originel n'est pas sécurisé. Soyez vigilant si vous décidez de cliquer sur ce lien.")
		if(meta_image) embed.setImage(meta_image)

		// Créer un bouton
		var row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setURL(unshortened.redirected)
			.setStyle(ButtonStyle.Link)
			.setLabel("Visiter la page"))

		// Envoyer l'embed
		interaction.editReply({ embeds: [embed], components: [unshortened.safe ? row : undefined].filter(Boolean) }).catch(err => {})
	}
}