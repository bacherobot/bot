const { SlashCommandBuilder } = require("discord.js")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("count")
		.setDescription("Compter le nombre de caractères dans un message")
		.addStringOption(option => option
			.setName("texte")
			.setDescription("Le texte à compter")
			.setRequired(true)),

	async execute(interaction){
		var count = interaction.options.getString("message")?.length
		interaction.reply(`Le message contient ${count} caractère${count > 1 ? "s" : ""}.`).catch(err => {})
	}
}
