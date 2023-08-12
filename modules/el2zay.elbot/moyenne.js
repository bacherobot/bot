const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('moyenne')
        .setDescription('Calculer la moyenne de deux nombres.')
        .addNumberOption(option =>
            option
                .setName('n1')
                .setDescription('Premier nombre.')
                .setMinValue(0)
                .setRequired(true))
        .addNumberOption(option =>
            option
                .setName('n2')
                .setDescription('Deuxième nombre.')
                .setRequired(true)),

    async execute(interaction) {
        r = (interaction.options.getNumber('n1') / interaction.options.getNumber('n2'))
        let q = Math.round(r * 20 * 100) / 100;
        let d = Math.round(r * 10 * 100) / 100;

        if (q == 20) {
            await interaction.reply(`**BRAVOOOOOO** 🎉🎉🎉🎉 Ta est de ${q}/20 donc de ${d}/10 🎉🎉🎉🎉`)
        } else if (q >= 17 && q < 20) {
            await interaction.reply(`**OOOOH GG** 👏👏 Ta note est de ${q}/20 donc de ${d}/10 👏👏`)
        } else if (q >= 13 && q < 17) {
            await interaction.reply(`C'est pas si mal ! Ta note est de ${q}/20 donc de ${d}/10 👏👏`)
        } else if (q >= 10 && q < 13) {
            await interaction.reply(`Ça passe... t'as la moyenne. Ta note est de ${q}/20 donc de ${d}/10`)
        } else if (q >= 5 && q < 10) {
            await interaction.reply(`Je ne souhaite pas m'exprimer à propos de ce sujet... Ta note est de ${q}/20 donc de ${d}/10`)
        } else if (q <= 5 && q >= 0) {
            await interaction.reply(`On va revoir les bases parce que vous êtes trop con. Ta note est de ${q}/20 donc de ${d}/10`)
        } else {
            var sentence = ["Alors frérot c'est impossible", "T'as vraiment eu ça mon reuf ?", "Tu m'as pris pour rmxbot pour être aussi con ?", "C'est mathématiquement statistiquement certainement impossible."]
            var random = Math.floor(Math.random() * sentence.length);
            await interaction.reply(sentence[random])
        }
    }
} 
