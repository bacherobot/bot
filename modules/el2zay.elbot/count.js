const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('count')
        .setDescription('Compter le nombre de caractères dans un message.')
        .addStringOption(option =>
			option
				.setName('message')
				.setDescription('Le message à compter.')
				.setRequired(true)),

        async execute(interaction) {
            interaction.reply("Le message contient " + interaction.options.getString('message').length + " caractères.")
    }
}
