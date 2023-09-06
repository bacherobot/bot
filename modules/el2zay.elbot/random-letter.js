const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("random-letter")
		.setDescription("Génère une lettre au hasard"),

	async execute(interaction){
		// Obtenir une lettre au hasard
		let alphabet = "abcdefghijklmnopqrstuvwxyz"
		let random = alphabet[Math.floor(Math.random() * alphabet.length)]

		// On defer l'interaction
		let msg = await interaction.deferReply().catch(err => {})

		// Créé un bouton pour relancer
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(`randomLetter-reroll-${msg.id}`)
			.setLabel("Relancer")
			.setStyle(ButtonStyle.Primary),)

		// Répondre avec la lettre et le bouton
		await interaction.editReply({ content: `La lettre est **${random}**`, components: [row] }).catch(err => {})

		// Quand quelqu'un clique sur le bouton
		const collector = interaction.channel.createMessageComponentCollector({ filter: i => i.customId === `randomLetter-reroll-${msg.id}` })
		collector.on("collect", async i => {
			// Si la personne qui clique n'est pas la bonne
			if(i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true }).catch(err => {})

			// On obtient une nouvelle lettre, et on répond avec
			let random = alphabet[Math.floor(Math.random() * alphabet.length)]
			await i.update({ content: `La lettre est **${random}**`, components: [row] }).catch(err => {})
		})
	}
}
