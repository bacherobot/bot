const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    slashInfo: new SlashCommandBuilder()

        .setName('qr')
        .setDescription('Générer un QR code.')
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('Le texte à encoder.')
                .setRequired(true)),

    async execute(interaction) {
        let text = interaction.options.getString('message')
        text = text.replace(/ /g, "%20");
        interaction.reply(`https://chart.googleapis.com/chart?cht=qr&chs=512x512&chl=${text}`)
    }
}