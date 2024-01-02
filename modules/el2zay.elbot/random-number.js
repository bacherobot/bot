const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("random-number")
		.setDescription("Générer un nombre aléatoire")
		.addIntegerOption(option => option
			.setName("entre")
			.setDescription("Nombre minimum")
			.setRequired(true))
		.addIntegerOption(option => option
			.setName("et")
			.setDescription("Nombre maximum")
			.setRequired(true)),

	async execute(interaction){
		// Min/max
		const min = interaction.options.getInteger("entre")
		const max = interaction.options.getInteger("et")
		if (max == min) return interaction.reply({ content: "Euhm… faudrait ptet que ça soit pas les mêmes nombre ?" }).catch(err => {})

		// On defer l'interaction, et on obtient un nombre aléatoire
		let msg = await interaction.deferReply()
		var random = Math.floor(Math.random() * (max - min + 1)) + min

		// Créé un bouton pour relancer
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(`relancer-${msg.id}`)
			.setLabel("Relancer")
			.setStyle(ButtonStyle.Primary),)

		// Créé un embed
		const embed = new EmbedBuilder()
			.setTitle(`Nombre aléatoire entre ${min} et ${max}`)
			.setDescription(`Le nombre est **${random}**.`)
			.setColor(bacheroFunctions.colors.primary)
		await interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})

		// Quand quelqu'un clique sur le bouton
		const filter = i => i.customId === `relancer-${msg.id}`
		const collector = interaction.channel.createMessageComponentCollector({ filter })
		collector.on("collect", async i => {
			if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true }).catch(err => {})
			var random = Math.floor(Math.random() * (max - min + 1)) + min
			embed.setDescription(`Le nombre est **${random}**.`)
			await i.update({ embeds: [embed], components: [row] }).catch(err => {})
		})
	}
}
