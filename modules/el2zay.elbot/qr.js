const { SlashCommandBuilder } = require("discord.js")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("qr")
		.setDescription("Génére un QR code")
		.addStringOption(option => option
			.setName("message")
			.setDescription("Le texte à encoder")
			.setMaxLength(1000)
			.setRequired(true)),

	async execute(interaction){
		let text = interaction.options.getString("message")
		interaction.reply(`https://chart.googleapis.com/chart?cht=qr&chs=512x512&chld=L|0&chl=${encodeURI(text)}`).catch(err => {})
	}
}