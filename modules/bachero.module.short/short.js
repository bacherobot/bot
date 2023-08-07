const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')
const fetch = require('node-fetch')
const escape = require('markdown-escape')
var instance = bacheroFunctions.config.getValue('bachero.module.short', 'defaultInstance')

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('short')
		.setDescription("Raccourcir une URL")
		.addStringOption(option => option.setName('url')
			.setDescription("URL à raccourcir (si non spécifié, le bot va raccourcir le dernier message ou celui en réponse)")
			.setRequired(false)
		),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply({ ephemeral: interaction.guildId ? true : false }).catch(err => { return 'stop' }) == 'stop') return

		// Si c'est une commande texte, tenter de supprimer le message d'invocation
		if(interaction.sourceType == 'textCommand'){
			try { interaction.delete().catch(err => {}) } catch(err) {} // Le choix de la sécurité
		}

		// Obtenir le terme de recherche
		let query = interaction.options.getString('url')

		// Si on a pas de terme de recherche, on va chercher le dernier message ou celui en réponse
		if(!query){
			// Chercher le message auquel on répond
			if(interaction?.reference?.messageId){
				var repliedTo = await interaction.channel.messages.fetch(interaction.reference.messageId).catch(err => {})
				if(repliedTo.content.includes('https://') || repliedTo.content.includes('http://')) query = repliedTo.content
			}

			// Sinon, on prend le dernier message
			else {
				query = await interaction.channel.messages.fetch({ limit: 1, before: interaction.id }).catch(err => {})
				query = query.first()
				query = query.content
				if(!query.includes('https://') && !query.includes('http://')) query = undefined
			}
		}

		// Si on a toujours pas de terme de recherche, on affiche une erreur
		if(!query) return interaction.editReply("Pour utiliser cette commande, vous devez inclure l'argument `url` dans votre commande, ou répondre à un message contenant un lien (ne fonctionne pas via les commandes slash).").catch(err => {})
		if(!query.includes('https://') && !query.includes('http://')) return interaction.editReply("L'URL obtenu ne semble pas être un lien valide.").catch(err => {})

		// Raccourcir le lien
		let shortened = await fetch(`${instance}api/shorten`, { method: 'POST', body: new URLSearchParams({ link: query }) }).then(res => res.json()).catch(err => { return { fetcherror: err } })

		// Si on a une erreur
		if(shortened.fetcherror) return await bacheroFunctions.report.createAndReply("requête vers l'API de Quecto", shortened.fetcherror || shortened, {}, interaction)
		if(shortened.status !== 200) return await bacheroFunctions.report.createAndReply("requête vers l'API de Quecto", shortened.data || shortened, {}, interaction)

		// Créer et envoyer l'embed
		var embed = new EmbedBuilder()
		.setTitle("Résultat du raccourcissement")
		.addFields([
			{ name: 'Raccourci', value: escape(shortened?.data?.shorten), inline: true },
			{ name: 'Originale', value: escape(shortened?.data?.original || query), inline: true },
		])
		.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
		.setFooter({ text: `Sous la demande de ${interaction.user.discriminator == '0' ? interaction.user.username : interaction.user.tag}` })
		interaction.editReply({ embeds: [embed] }).catch(err => {})
	}
}