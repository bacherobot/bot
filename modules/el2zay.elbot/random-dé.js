const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('random-dé')
        .setDescription('Génère une lettre au hasard.')
        .addIntegerOption(option => option.setName('type')
            .setDescription("Dans combien de temps le sondage se termine ?")
            .setChoices(
                { name: 'dé de 4', value: 4 },
                { name: 'dé de 6', value: 6 },
                { name: 'dé de 8', value: 8 },
                { name: 'dé de 10', value: 10 },
                { name: 'dé de 12', value: 12 },
                { name: 'dé de 20', value: 20 },
            )
            .setRequired(true))
        .addIntegerOption(option => option.setName('nombre')
            .setDescription("Nombre de dés à lancer")
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
        .addIntegerOption(option => option.setName('modificateur')
            .setDescription("Ajoute une valeur au total de vos lancers ")
            .setRequired(false)),

    async execute(interaction) {
        let msg = await interaction.deferReply()
        // Créé un bouton pour relancer
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`relancer-${msg.id}`)
                .setLabel('Relancer')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`add-${msg.id}`)
                .setLabel('Ajouter un dé')
                .setStyle(ButtonStyle.Secondary)
        )
        // Faire un random selon le type de dé
        var random = Math.floor(Math.random() * interaction.options.getInteger('type')) + 1
        // Embed
        const embed = new EmbedBuilder()
            .setTitle(`Lancer de dé`)
            .addFields(
                { name: 'Dé', value: `${random}`, inline: true },
                { name: 'Total', value: `${random + interaction.options.getInteger('modificateur')}`, inline: false }
            )
            .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))

        await interaction.editReply({ embeds: [embed], components: [row] }).catch(err => { })
            const filter_confirm = i => i.customId == `relancer-${msg.id}` || i.customId == `add-${msg.id}`
            const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filter_confirm })
            collector_confirm.on('collect', async i => {
                // Si l'utilisateur ne veut plus supprimer le salon
                if (i.customId == `relancer-${msg.id}`) {
                    // TODO

                }

                if (i.customId == `add-${msg.id}`) {
                    // Ajouter un dé à une liste
                    var list = []
                    var somme = 0
                    var random = 0
                    var nombre = interaction.options.getInteger('nombre')
                    if (!nombre) { nombre = 1 }
                    for (let index = 0; index < nombre; index++) {
                        random = Math.floor(Math.random() * interaction.options.getInteger('type')) + 1
                        list.push(random)
                        somme += random
                    }
                    // Embed
                    const embed = new EmbedBuilder()
                        .setTitle(`Lancer de dé`)
                        .addFields(
                            { name: 'Dés', value: `${list}`, inline: true },
                            { name: 'Total', value: `${somme + interaction.options.getInteger('modificateur')}`, inline: false }
                        )
                        .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))

                        await i.update({ embeds: [embed], components: [row] }).catch(err => { })
                    }
            })
    }
}
