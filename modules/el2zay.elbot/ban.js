const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ComponentType, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js')
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
                .setMaxLength(4000)
                .setRequired(false)),


    async execute(interaction) {
        const member = (await interaction.options.getUser('membre'))
        if (!member?.id) return interaction.reply({ content: "Le membre n'existe pas.", ephemeral: true })
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
        if (member.id == owner) return interaction.reply({ content: "Tu ne peux pas bannir le propriétaire du serveur.", ephemeral: true }).catch(err => { })
        // Si le membre est le bot
        if (memberID == interaction.client.user.id) {
            var embed = new EmbedBuilder()
                .setTitle(`Bannissement de ${botName} ?`)
                .setAuthor({ name: interaction.user.username, iconURL: avatar })
                .setDescription(`Es-tu sûr de vouloir me bannir ? 🥲`)
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                .setThumbnail('https://github.com/bacherobot/ressources/blob/main/elbot/elbot%20bsod.jpeg?raw=true')
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
                    // Envoyer "discord ne me premet pas de me bannir" et ajouter cette vidéo en attachement https://github.com/bacherobot/ressources/assets/79168733/f1e1b689-f2c9-457a-a96a-163386bd3a13
                    return interaction.followUp({ content: "Discord ne me permet pas de me bannir", files: [new AttachmentBuilder("https://github-production-user-asset-6210df.s3.amazonaws.com/79168733/264065396-f1e1b689-f2c9-457a-a96a-163386bd3a13.mp4")] }).catch(err => { })
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
            if (!isDmed) isDmImpossible = true
        }

        var isBanPossible = await interaction.guild.members.ban(member, { reason: reason }).catch(err => { return { err: err } })
        if (isBanPossible.err && memberID != interaction.client.user.id) return bacheroFunctions.report.createAndReply("bannissement", isBanPossible.err || isBanPossible, {}, interaction)

        var embed = new EmbedBuilder()
            .setTitle('Bannissement')
            .setAuthor({ name: interaction.user.username, iconURL: avatar })
            .setDescription('Un modérateur a frappé !')
            .setColor(0xff2812)
            .setThumbnail('https://github.com/bacherobot/ressources/blob/main/elbot/ban%20hammer.png?raw=true')

            .addFields(
                { name: 'Membre banni', value: member.username, inline: false },
                { name: 'Raison', value: reason, inline: false },
            )
        // Si interaction.options.getBoolean('avertir') est sur true mettre le footer Bonjour sinon mettre le footer au revoir
        if (interaction.options.getBoolean('avertir')) embed.setFooter({ text: isDmImpossible ? `${member.username} n'a pas pu être prévenu` : `${member.username} a été prévenu` })
        interaction.reply({ embeds: [embed] }).catch(err => { })
    }
}
