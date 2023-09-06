const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("yesno")
		.setDescription("Vous donne une réponse à la question : oui ou non ?"),

	async execute(interaction){
		// Defer l'interaction
		let msg = await interaction.deferReply().catch(err => {})

		// Déterminer le résultat
		var random = Math.floor(Math.random() * 2)
		random == 0 ? random = "Et c'est un **OUI !**" : random = "Et c'est un **non…**"

		// Créé un bouton pour relancer
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(`relancer-${msg.id}`)
			.setLabel("Relancer")
			.setStyle(ButtonStyle.Primary))

		// Répondre à l'interaction
		await interaction.editReply({ content: `${random}`, components: [row] }).catch(err => {})

		// Créer un collector pour le bouton
		const collector = interaction.channel.createMessageComponentCollector({ filter: i => i.customId === `relancer-${msg.id}` })
		collector.on("collect", async i => {
			// Si c'est pas la bonne personne
			if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true }).catch(err => {})

			// Déterminer le résultat, puis mettre à jour le message
			var random = Math.floor(Math.random() * 2)
			random == 0 ? random = "Et c'est un **OUI !**" : random = "Et c'est un **non…**"
			await i.update({ content: `${random}`, components: [row] }).catch(err => {})
		})
	}
}