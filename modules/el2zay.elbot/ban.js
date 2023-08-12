const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js')
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
        const member = interaction.options.getUser('membre')
        const owner = interaction.guild.ownerId
        var reason = interaction.options.getString('raison')
        username = interaction.member.user.username
        const avatar = interaction.member.user.avatarURL({ format: 'png', dynamic: true, size: 1024 })
        const user_id = interaction.user.id

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
        //Si le membre est l'owner
        if (member.id == owner) return interaction.reply({ content: "Tu ne peux pas bannir le propriétaire du serveur.", ephemeral: true })
        // Si le membre est le bot
        if (member.tag == client.user.tag) {
            var embed = new EmbedBuilder()
                .setTitle(`Bannissement de ${client.user.username} ?`)
                .setAuthor({ name: interaction.user.username, iconURL: avatar })
                .setDescription(`Es-tu sûr de vouloir me bannir ? 🥲`)
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                .setThumbnail('https://cdn.discordapp.com/attachments/795288700594290698/909889058212311061/Sans_titre_1.jpeg')
                .setFooter({ text: `Ouin ouin` })

            interaction.reply({ embeds: [embed], components: [rowConfirm] }).catch(err => { })
            const filter_confirm = i => i.customId == `yes` || i.customId == `no`
            const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filter_confirm, time: 999999 })
            collector_confirm.on('collect', async i => {
                // Vérifier que la personne a les permissions de gérer les messages ou de gérer le salon
                if (!interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageChannels) && !interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageMessages)) return i.reply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission de gérer les messages ou de gérer ce salon.", ephemeral: true })

                // Si l'utilisateur ne veut plus supprimer le salon
                if (i.customId == 'no') {
                    interaction.editReply({ content: "Opération annulée merci beaucoup d'utiliser Bachero." }).catch(err => { })
                }

                if (i.customId == 'yes') {
                    interaction.editReply({ content: "Ce n'est qu'un aurevoir j'espère." }).catch(err => { })
                    interaction.guild.members.ban(member, { reason: reason })
                }
            })
        }

        interaction.guild.members.ban(member, { reason: reason })
        var embed = new EmbedBuilder()
            .setTitle('Bannissement')
            .setAuthor({ name: interaction.user.username, iconURL: avatar })
            .setDescription('Un modérateur a frappé !')
            .setColor(0xff2812)
            .setThumbnail('https://cdn.discordapp.com/attachments/795288700594290698/879044070255759410/pngaaa.com-1429166.png')

            .addFields(
                { name: 'Membre banni', value: member.username, inline: false },
                { name: 'Raison', value: reason, inline: false },
            )
            // Si interaction.options.getBoolean('avertir') est sur true mettre le footer Bonjour sinon mettre le footer au revoir
            .setFooter({ text: interaction.options.getBoolean('avertir') ? `${member.username} a été prévenu` : `${member.username} n'a pas été prévenu.` })
        interaction.reply({ embeds: [embed] }).catch(err => { })
        // Envoie l'embed dans le salon
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
            member.send({ embeds: [embed] }).catch(err => { })
        }
    }
}
