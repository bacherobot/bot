const { SlashCommandBuilder } = require("discord.js")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("freevbucks")
		.setDescription("générateur vbucks gratuit en illimité"),

	async execute(interaction){
		await interaction.reply("nn 😹🫵").catch(err => {})
	}
}