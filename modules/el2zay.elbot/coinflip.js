const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Pile ou face ?'),

    async execute(interaction) {
        const faceEmoji = "<:face:1143610184669859981>"
        const pileEmoji = "<:pile:1143610180630745249>"

        var random = Math.floor(Math.random() * 2)

        random == 0 ? random = `${faceEmoji} C'est face !` : random = `${pileEmoji} C'est pile !`

        // Créé un bouton pour relancer
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('relancer')
                .setLabel('Relancer')
                .setStyle(ButtonStyle.Primary),
        )
        await interaction.reply({ content: `**${random}**`, components: [row] }).catch(err => { })
        const filter = i => i.customId === 'relancer'
        const collector = interaction.channel.createMessageComponentCollector({ filter })
        collector.on('collect', async i => {
            // Si la personne qui clique n'est pas interaction.user.id
            if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true }).catch(err => { })
            var random = Math.floor(Math.random() * 2)
            random == 0 ? random = `${faceEmoji} C'est face !` : random = `${pileEmoji} C'est pile !`
            await i.update({ content: ` **${random}**`, components: [row] }).catch(err => { })
        })
    }
}

