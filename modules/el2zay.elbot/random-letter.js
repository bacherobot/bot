const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('random-letter')
        .setDescription('Génère une lettre au hasard.'),

    async execute(interaction) {
        let alphabet = "abcdefghijklmnopqrstuvwxyz"
        let random = alphabet[Math.floor(Math.random() * alphabet.length)]
        let msg = await interaction.deferReply();
        
        // Créé un bouton pour relancer
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`relancer-${msg.id}`)
                .setLabel('Relancer')
                .setStyle(ButtonStyle.Primary),
        )
        await interaction.editReply({ content: `La lettre est **${random}**`, components: [row] }).catch(err => { })
        const filter = i => i.customId === `relancer-${msg.id}`
        const collector = interaction.channel.createMessageComponentCollector({ filter })
        collector.on('collect', async i => {
            // Si la personne qui clique n'est pas interaction.user.id
            if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true })
            let random = alphabet[Math.floor(Math.random() * alphabet.length)]
            await i.update({ content: `La lettre est **${random}**`, components: [row] }).catch(err => { })
        })
    }
}
