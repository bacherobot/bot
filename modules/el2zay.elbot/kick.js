const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Pour expulser un membre du serveur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .setDMPermission(false)
        .addUserOption(option =>
            option
                .setName('membre')
                .setDescription('Le membre à expulser.')
                .setRequired(true))
        .addBooleanOption(option =>
            option
                .setName('avertir')
                .setDescription('Si le membre doit être averti par DM.')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('raison')
                .setDescription('La raison du kick.')
                .setRequired(false)),

    async execute(interaction) {
        const member = interaction.options.getUser('membre')

        var reason = interaction.options.getString('raison')
        username = interaction.member.user.username
        const avatar = interaction.member.user.avatarURL({ format: 'png', dynamic: true, size: 1024 })

        if (!reason) { reason = "Aucune raison donnée" }

        interaction.guild.members.kick(member, { reason: reason })
        var embed = new EmbedBuilder()
            .setTitle('Kick')
            .setAuthor({ name: interaction.user.username, iconURL: avatar })
            .setDescription('Un modérateur a frappé !')
            .setColor(0xff2812)
            .setThumbnail('https://www.computerhope.com/jargon/k/kick.png')

            .addFields(
                { name: 'Membre expulser', value: member.username, inline: false },
                { name: 'Raison', value: reason, inline: false },
            )
            // Si interaction.options.getBoolean('avertir') est sur true mettre le footer Bonjour sinon mettre le footer au revoir
            .setFooter({ text: interaction.options.getBoolean('avertir') ? `${member.username} a été prévenu` : `${member.username} n'a pas été prévenu.` })
        interaction.reply({ embeds: [embed] }).catch(err => { })
        // Envoie l'embed dans le salon
        if (interaction.options.getBoolean('avertir')) {
            // Envoyer un mp au membre banni
            embed = new EmbedBuilder()
                .setTitle('Kick')
                .setAuthor({ name: interaction.user.username, iconURL: avatar })
                .setDescription('Un modérateur a frappé !')
                .setColor(0xff2812)
                .setImage('https://media.tenor.com/5JmSgyYNVO0AAAAS/asdf-movie.gif')
                .addFields(
                    { name: 'Membre expulser', value: "Vous avez été expulsé.", inline: false },
                    { name: 'Raison', value: reason, inline: false },
                )
                .setFooter({ text: `Tu peux toujours revenir sur le serveur.` })
            member.send({ embeds: [embed] }).catch(err => { })
        }
    }
}
