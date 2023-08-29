const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder, time } = require('discord.js')
const bacheroFunctions = require('../../functions')
const escape = require('markdown-escape')
module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription("Tirer au hasard ce que quelqu'un gagnera.")
        .addStringOption(option =>
            option
                .setName('cadeau')
                .setDescription('Le cadeau à gagner.')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('secondes')
                .setDescription('Le nombre de secondes avant de commencer.')
                .setMinValue(2))
        .addIntegerOption(option =>
            option
                .setName('min_participants')
                .setDescription('Le nombre minimum de participants.')
                .setMinValue(2))
        .addIntegerOption(option =>
            option
                .setName('max_participants')
                .setDescription('Le nombre maximum de participants.')
                .setMinValue(2)),


    async execute(interaction) {
        let msg = await interaction.deferReply()
        var participation = []
        const date = new Date()
        date.setSeconds(date.getSeconds() + (interaction.options.getInteger('secondes') || 20))
        const relative = time(date, 'R')
        const min_participants = interaction.options.getInteger('min_participants') || 2

        if (interaction.options.getString('cadeau').toLowerCase() == 'rien') return interaction.editReply({ content: "T'es radin toi", ephemeral: true })
        const rowConfirm = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ok-${msg.id}`)
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`no-${msg.id}`)
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary),
        )

        const filter_confirm = i => i.customId == `ok-${msg.id}` || i.customId == `no-${msg.id}`
        const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filter_confirm })
        collector_confirm.on('collect', async i => {
            if (i.customId == `ok-${msg.id}`) {
                // Si la personne a déjà participé
                if (participation.includes(i.user.id)) return i.reply({ content: `🚫 Vous participez déjà à la roulette !`, ephemeral: true })
                // Ajouter la personne dans le tableau
                participation.push(i.user.id)
                await i.reply({ content: `Vous participez à la roulette !`, ephemeral: true })
            }
            if (i.customId == `no-${msg.id}`) {
                // Si la personne ne participe pas encore
                if (!participation.includes(i.user.id)) return i.reply({ content: `🚫 Vous ne participez pas à la roulette !`, ephemeral: true })

                // Retirer la personne du tableau
                participation.splice(participation.indexOf(i.user.id), 1)
                await i.reply({ content: `Vous ne participez plus à la roulette !`, ephemeral: true })

            }
            embed.setFields(
                { name: "Temps restant", value: `${relative}`, inline: true },
                { name: "Cadeau à gagner", value: `||${escape(interaction.options.getString('cadeau'))}||`, inline: true },
                { name: "Participants", value: participation ? participation.length.toString() : '0', inline: true }
            )
            if (interaction.options.getInteger('max_participants')) embed.addFields({ name: "Nombre restant de participations.", value: `${interaction.options.getInteger('max_participants') - participation.length}`, inline: true })
            if (interaction.options.getInteger('min_participants')) embed.addFields({ name: "Nombre minimum de participants.", value: `${interaction.options.getInteger('min_participants')}`, inline: true })

            interaction.editReply({ embeds: [embed], components: [rowConfirm] })
            if (interaction.options.getInteger('max_participants') == participation.length) { endRoulette() }
        })

        embed = new EmbedBuilder()
            .setTitle('Roulette')
            .setDescription(`<@${interaction.user.id}> a lancé la roulette !\nCliquez sur le bouton pour participer.`)
            .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
            .addFields(
                // Si time est à une seconde ou moins remplacer secondes par seconde
                { name: "Temps restant", value: `${relative}`, inline: true },
                { name: "Cadeau à gagner", value: `||${escape(interaction.options.getString('cadeau'))}||`, inline: true },
                { name: "Participants", value: participation ? participation.length.toString() : '0', inline: true }
            )
        if (interaction.options.getInteger('max_participants')) embed.addFields({ name: "Nombre restant de participations.", value: `${interaction.options.getInteger('max_participants')}`, inline: true })
        if (interaction.options.getInteger('min_participants')) embed.addFields({ name: "Nombre minimum de participants.", value: `${interaction.options.getInteger('min_participants')}`, inline: true })

        await interaction.editReply({ embeds: [embed], components: [rowConfirm] })
        const delay = date.getTime() - Date.now()

        // TODO Si le nombre de participants est atteint, arrêter le timout
        await new Promise(resolve => setTimeout(resolve, delay))
        async function endRoulette() {
            collector_confirm.stop()
            var winner = participation[Math.floor(Math.random() * participation.length)]
            // Si il n'y a pas de participants
            if (!winner || participation.length < min_participants) {
                // TODO : Faire qu'il ne modifie que l'embed en question et pas les autres.
                embed = new EmbedBuilder()
                    .setTitle('Roulette')
                    .setDescription(`Il y a eu trop peu de participants pour cette roulette...\nDonc aucun gagnant.`)
                    .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                    .setFooter({ text: "Comme c'est dommage !" })
                await interaction.channel.send({ embeds: [embed], components: [] })
                return interaction.deleteReply().catch(err => { })
            }
            embed = new EmbedBuilder()
                .setTitle('Roulette')
                .setDescription(`Le grand gagnant (ou perdant) de cette roulette est ||<@${winner}>|| qui a gagné ${escape(interaction.options.getString('cadeau'))} !`)
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                .setFooter({ text: "J'espère ton cadeau est bien" })
            await interaction.channel.send({ embeds: [embed], components: [] })
            return interaction.deleteReply().catch(err => { })
        } endRoulette()
    }
}
