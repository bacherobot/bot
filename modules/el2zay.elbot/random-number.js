const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('random-number')
        .setDescription('Générer un nombre aléatoire.')
        .addIntegerOption(option =>
            option
                .setName('entre')
                .setDescription('Le minimum')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('et')
                .setDescription('Le maximum')
                .setRequired(true)),

    async execute(interaction) {
        const min = interaction.options.getInteger('entre')
        const max = interaction.options.getInteger('et')
        let msg = await interaction.deferReply();
        if (max == min) return interaction.editReply({content: "Euhm… un random entre les mêmes nombre ?"})
        var random = Math.floor(Math.random() * (max - min + 1)) + min

        // Créé un bouton pour relancer
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`relancer-${msg.id}`)
                .setLabel('Relancer')
                .setStyle(ButtonStyle.Primary),
        )

        // Créé un embed
        const embed = new EmbedBuilder()
            .setTitle(`Nombre aléatoire entre ${min} et ${max}`)
            .setDescription(`Le nombre est **${random}**.`)
            .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))

        await interaction.editReply({ embeds: [embed], components: [row] }).catch(err => { })
        const filter = i => i.customId === `relancer-${msg.id}`
        const collector = interaction.channel.createMessageComponentCollector({ filter })
        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true })
            var random = Math.floor(Math.random() * (max - min + 1)) + min
            embed.setDescription(`Le nombre est **${random}**.`)
            await i.update({ embeds: [embed], components: [row] }).catch(err => { })
        })
    }
}
