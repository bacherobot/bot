const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const fetch = require("node-fetch")
const bacheroFunctions = require("../../functions")

// Liste des contributeurs mis dans le cache
var cacheContributors = {}

// Faire un bouton avec le lien du repo
var row = new ActionRowBuilder().addComponents(new ButtonBuilder()
	.setURL("https://github.com/bacherobot/bot")
	.setStyle(ButtonStyle.Link)
	.setLabel("Voir le dépôt GitHub"))

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("contributeurs")
		.setDescription("Liste les personnes ayant le plus contribué au développement de ce robot"),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// On defer l'interaction, si c'est pas une commande texte (on a pas besoin de defer pour les commandes texte car il n'y a pas de timeout)
		if(interaction.sourceType != "textCommand" && await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Si on a pas encore les contributeurs dans le cache, les récupérer
		if(!cacheContributors?.data || cacheContributors?.lastUsed < Date.now() - (1000 * 60 * 60)){ // (une heure)
			cacheContributors = {
				data: (await fetch("https://api.github.com/repos/bacherobot/bot/contributors")
					.then(res => res.json())
					.catch(err => { return [] })
				)
					.sort((a, b) => b.contributions - a.contributions)
					.filter(contributor => contributor.contributions)
					.map(contributor => {
						return {
							name: contributor.login,
							contributions: contributor.contributions,
							profile: contributor.html_url
						}
					})
					.slice(0, 25), // 25 premiers contributeurs
				lastUsed: Date.now()
			}
		}

		// Si on a déjà l'embed dans le cache, l'utiliser
		if(cacheContributors?.embed && interaction.sourceType == "textCommand") return interaction.reply({ embeds: [cacheContributors.embed], components: [row] }).catch(err => {})
		else if(cacheContributors?.embed) return interaction.editReply({ embeds: [cacheContributors.embed], components: [row] }).catch(err => {})

		// Sinon, on va créer l'embed
		var embed = new EmbedBuilder()
			.setTitle("Liste des contributeurs")
			.setColor(bacheroFunctions.colors.primary)

		// On ajoute les contributeurs
		var charsSum = 0
		cacheContributors.data.forEach((contributor, index) => {
			// Vérifier la limite de caractères
			charsSum += 20 + contributor.contributions + (index + 1) + contributor.name.length + contributor.profile.length // on calcule le nombre de caractères que prendra ce field
			if(charsSum > 6000) return // si on dépasse la limite de caractères, on arrête d'ajouter des contributeurs

			// Ajouter le contributeur à l'embed
			embed.addFields([{
				name: `${index + 1}. ${contributor.name}`,
				value: `${contributor.contributions} contribution${contributor.contributions > 1 ? "s" : ""} | [Profil](${contributor.profile})`,
				inline: true
			}])
		})

		// Répondre avec l'embed
		if(interaction.sourceType == "textCommand") interaction.reply({ embeds: [embed], components: [row] }).catch(err => {})
		else interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}