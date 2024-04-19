const { SlashCommandBuilder } = require("discord.js")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("qr")
		.setDescription("Génére un QR code avec un texte ou un lien")
		.addStringOption(option => option
			.setName("message")
			.setDescription("Le texte à encoder")
			.setMaxLength(1000)
			.setRequired(true)),

	async execute(interaction){
		let text = interaction.options.getString("message")
		interaction.reply(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURI(text)}&size=512x512`).catch(err => {})
	}
}