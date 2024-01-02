const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const escape = require("markdown-escape")

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("first")
		.setDescription("Affiche le premier message dans ce salon"),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Vérifier si l'utilisateur est limité, et si c'est pas le cas, le limiter
		var checkAndReply = await bacheroFunctions.cooldown.checkAndReply(interaction, "firstCommandeUsage")
		if(checkAndReply) return; else await bacheroFunctions.cooldown.set("firstCommandeUsage", interaction.user.id, 5000)

		// Mettre la réponse en defer et obtenir la date
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return
		var date = Date.now()

		// Obtenir le premier message
		var first = await interaction.channel.messages.fetch({
			after: 1,
			limit: 1,
		}).catch(err => {})
		var first = first.first()

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle(`Premier message${interaction?.channel?.name?.length ? ` dans \`#${interaction.channel.name}\`` : ""}`)
			.setDescription(first.content || first?.embeds?.[0]?.description || first.url || "Impossible d'obtenir le contenu")
			.addFields(
				{ name: "Date", value: `<t:${Math.round(first.createdTimestamp / 1000)}:f>`, inline: true },
				{ name: "Auteur", value: first.author.discriminator == "0" ? escape(first.author.username) : escape(first.author.tag), inline: true },
				{ name: "Identifiant", value: first.id, inline: true }
			)
			.setColor(bacheroFunctions.colors.primary)
			.setFooter({ text: `Résultat obtenu en ${Math.round((new Date().getTime() - date))} ms` })

		// Créé un bouton
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setURL(first.url || "https://discord.com") // oui parce que si on a pas la valeur du .url, ça crash
			.setStyle(ButtonStyle.Link)
			.setLabel("Accéder au message"),)

		// Répondre à l'interaction
		interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}