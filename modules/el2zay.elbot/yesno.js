const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('yesno')
        .setDescription('Oui ou non ?'),

    async execute(interaction) {
        let msg = await interaction.deferReply();
        var random = Math.floor(Math.random() * 2)

        random == 0 ? random = "Et c'est un **OUI !**" : random = "Et c'est un **non…**"

        // Si le random tombe sur oui et qu'une personne répond go ou fi lui répondre ta gueule.

        // Créé un bouton pour relancer
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`relancer-${msg.id}`)
                .setLabel('Relancer')
                .setStyle(ButtonStyle.Primary),
        )
        await interaction.editReply({ content: `${random}`, components: [row] }).catch(err => { })
        const filter = i => i.customId === `relancer-${msg.id}`
        const collector = interaction.channel.createMessageComponentCollector({ filter })
        collector.on('collect', async i => {
            // Si la personne qui clique n'est pas interaction.user.id
            if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true }).catch(err => { })
            var random = Math.floor(Math.random() * 2)
            random == 0 ? random = "Et c'est un **OUI !**" : random = "Et c'est un **non…**"

            await i.update({ content: `${random}`, components: [row] }).catch(err => { })
        })
    }
}