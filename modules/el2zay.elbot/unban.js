const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Débannir un membre du serveur.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption(option =>
            option
                .setName('membre')
                .setDescription('Le pseudo du membre à débannir.')
                .setRequired(true))
        .addBooleanOption(option =>
            option
                .setName('avertir')
                .setDescription('Si le membre doit être averti par DM.')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('raison')
                .setDescription('La raison du déban.')
                .setRequired(false)),

    async execute(interaction) {
        const member = interaction.options.getString('membre')
        var reason = interaction.options.getString('raison')
        const bannedUsers = await interaction.guild.bans.fetch()
        if (!reason) reason = "Aucune raison donnée"

        // TODO: Réparer l'unban.

        // Déban l'utilisateur avec son pseudo 
        if (bannedUsers.some(user => user.user.id === member.id)) {
            const user = bannedUsers.find(user => user.user.id === member.id)
            const avatar = interaction.user.avatarURL({ format: 'png', dynamic: true, size: 1024 })

            var isUnbanPossible = await interaction.guild.members.unban(user.user.id, reason).catch(err => { return {err:err} })
            if(isUnbanPossible.err) return await bacheroFunctions.report.createAndReply("débannissement", isUnbanPossible.err || isUnbanPossible, {}, interaction) 

            var isDmImpossible = false // on vérifie si on peut envoyer le dm au gars
            if (interaction.options.getBoolean('avertir')) {
                // Créé un lien d'invitation
                interaction.channel.createInvite().then(async invite => {
                    embedunban = new EmbedBuilder()
                        .setTitle('Bonne nouvelle !')
                        .setAuthor({ name: interaction.user.username, iconURL: avatar })
                        .setDescription(`Vous avez été débanni du serveur ${interaction.guild.name} ! Vous pouvez revenir sur le serveur en cliquant [ici](${invite.code})).`)
                        .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                        .setImage('https://github.com/bacherobot/ressources/blob/main/elbot/elbot%20D.png?raw=true')
                    var isDmed = await member.send({ embeds: [embedunban] }).catch(_err => { return false })
                    if(!isDmed) isDmImpossible = true
                })

                var embed = new EmbedBuilder()
                .setTitle(`Débannissement`)
                .setAuthor({ name: interaction.user.username, iconURL: avatar })
                .setDescription(`J'espère que vous lui feriez un bon accueil à son retour !`)
                .addFields(
                    { name: 'Membre débanni', value: member, inline: false },
                    { name: 'Raison', value: reason, inline: false },
                )
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                if(interaction.options.getBoolean('avertir')) embed.setFooter({ text: isDmImpossible ? `${member} n'a pas pu être prévenu` : `${member} a été prévenu` })
                interaction.reply({ embeds: [embed] })
            }
        } else {
            return interaction.reply({ content: `L'utilisateur ${member} n'est pas banni.`, ephemeral: true })
        }
    }
}
