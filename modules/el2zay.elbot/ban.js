const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ComponentType, ButtonBuilder, ButtonStyle } = require('discord.js')
const bacheroFunctions = require('../../functions')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannir un membre du serveur.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option
                .setName('membre')
                .setDescription('Le membre a bannir.')
                .setRequired(true))
        .addBooleanOption(option =>
            option
                .setName('avertir')
                .setDescription('Si le membre doit être averti par DM.')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('raison')
                .setDescription('La raison du ban.')
                .setRequired(false)),


    async execute(interaction) {
        const member = (await interaction.options.getUser('membre'))
        if(!member?.id) return interaction.reply({ content: "Le membre n'existe pas.", ephemeral: true })
        const memberID = member.id
        const owner = interaction.guild.ownerId
        var reason = interaction.options.getString('raison')
        username = member.username
        // Avatar de celui qui a executé la commande
        const avatar = interaction.user.avatarURL({ format: 'png', dynamic: true, size: 1024 })

        const rowConfirm = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('no')
                .setLabel('Ouais bon au final non')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('yes')
                .setLabel('Je suis certain.')
                .setStyle(ButtonStyle.Danger),
        )

        if (!reason) { reason = "Aucune raison donnée" }

        // Récupérer le nom du bot
        var botName = bacheroFunctions.config.getValue('bachero', 'botName')

        //Si le membre est l'owner
        if (member.id == owner) return interaction.reply({ content: "Tu ne peux pas bannir le propriétaire du serveur.", ephemeral: true })
        // Si le membre est le bot
        if (memberID == interaction.client.user.id) {
            var embed = new EmbedBuilder()
                .setTitle(`Bannissement de ${botName} ?`)
                .setAuthor({ name: interaction.user.username, iconURL: avatar })
                .setDescription(`Es-tu sûr de vouloir me bannir ? 🥲`)
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                .setThumbnail('https://cdn.discordapp.com/attachments/795288700594290698/909889058212311061/Sans_titre_1.jpeg')
                .setFooter({ text: `uhuhuhuhu Ouin ouin` })

            interaction.reply({ embeds: [embed], components: [rowConfirm] }).catch(err => { })

            const filter_confirm = i => i.customId == `yes` || i.customId == `no`
            const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filter_confirm })
            collector_confirm.on('collect', async i => {
                // Si l'utilisateur ne veut plus supprimer le salon
                if (i.customId == 'no') {
                    return i.reply({ content: "Opération annulée merci beaucoup d'utiliser Bachero.", ephemeral: true }).catch(err => { })
                }

                if (i.customId == 'yes') {
                    return interaction.channel.send({ content: "Discord ne me permet pas de me bannir https://cdn.discordapp.com/attachments/902994073533694012/1139961644601057290/youtube_TkX4bee77t8_432x244_h264.MP4" }).catch(err => { })
                }
            })
        }

        var isDmImpossible = false // on vérifie si on peut envoyer le dm au gars
        if (interaction.options.getBoolean('avertir')) {
            // Envoyer un mp au membre banni
            embed = new EmbedBuilder()
                .setTitle('Bannissement')
                .setAuthor({ name: interaction.user.username, iconURL: avatar })
                .setDescription('Un modérateur a frappé !')
                .setColor(0xff2812)
                .setImage('https://media.tenor.com/BeHgpjAGbJEAAAAd/ban-hammer.gif')
                .addFields(
                    { name: 'Membre banni', value: "Vous avez été banni.", inline: false },
                    { name: 'Raison', value: reason, inline: false },
                )
                .setFooter({ text: `Miskin` })
            var isDmed = await member.send({ embeds: [embed] }).catch(err => {
                return false
            })
            if(!isDmed) isDmImpossible = true
        }

        var isBanPossible = await interaction.guild.members.ban(member, { reason: reason }).catch(err => { return {err:err} })
        if(isBanPossible.err) return await bacheroFunctions.report.createAndReply("bannissement", isBanPossible.err || isBanPossible, {}, interaction)

        var embed = new EmbedBuilder()
            .setTitle('Bannissement')
            .setAuthor({ name: interaction.user.username, iconURL: avatar })
            .setDescription('Un modérateur a frappé !')
            .setColor(0xff2812)
            .setThumbnail('https://cdn.discordapp.com/attachments/795288700594290698/879044070255759410/pngaaa.com-1429166.png')

            .addFields(
                { name: 'Membre banni', value: member.username, inline: false },
                { name: 'Raison', value:    reason, inline: false },
            )
            // Si interaction.options.getBoolean('avertir') est sur true mettre le footer Bonjour sinon mettre le footer au revoir
            if(interaction.options.getBoolean('avertir')) embed.setFooter({ text: isDmImpossible ? `${member.username} n'a pas pu être prévenu` : `${member.username} a été prévenu` })
        interaction.reply({ embeds: [embed] }).catch(err => { })
    }
}
