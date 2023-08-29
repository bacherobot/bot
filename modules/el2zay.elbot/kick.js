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
        const member = (await interaction.options.getUser('membre'))
        if (!member?.id) return interaction.reply({ content: "Le membre n'existe pas.", ephemeral: true })
        var reason = interaction.options.getString('raison')
        username = member.username
        const avatar = interaction.user.avatarURL({ format: 'png', dynamic: true, size: 1024 })
        var botName = bacheroFunctions.config.getValue('bachero', 'botName')

        if (!reason) { reason = "Aucune raison donnée" }
        try {
            await interaction.guild.members.kick(member, { reason: reason })
        } catch (err) {
            // Signaler une erreur
            embed = new EmbedBuilder()
                .setTitle("Impossible d'expulser le membre")
                .setDescription("Un problème est survenu lors du kick du membre :\n```\n" + (err?.toString()?.replace(/`/g, ' `').replace('Missing Permissions', "Je n'ai pas la permission de kick ce membre.") || err) + "\n```")
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                .setFooter({ text: `Si vous pensez que ce problème a quelque chose à voir avec ${botName}, n'hésitez pas à le signaler` })
            return interaction.reply({ embeds: [embed], components: [], content: null }).catch(err => { })
        }

        // TODO vérifier si la personne a été prévenue

        var isDmImpossible = false // on vérifie si on peut envoyer le dm au gars
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
            var isDmed = await member.send({ embeds: [embed] }).catch(err => {
                return false
            })
            if (!isDmed) isDmImpossible = true
        }


        var embed = new EmbedBuilder()
            .setTitle('Kick')
            .setAuthor({ name: interaction.user.username, iconURL: avatar })
            .setDescription('Un modérateur a frappé !')
            .setColor(0xff2812)
            .setThumbnail('https://github.com/bacherobot/ressources/blob/main/elbot/kick.png?raw=true')

            .addFields(
                { name: 'Membre expulser', value: member.username, inline: false },
                { name: 'Raison', value: reason, inline: false },
            )
            // Si interaction.options.getBoolean('avertir') est sur true mettre le footer Bonjour sinon mettre le footer au revoir
            .setFooter({ text: interaction.options.getBoolean('avertir') ? `${member.username} a été prévenu` : `${member.username} n'a pas été prévenu.` })
        interaction.reply({ embeds: [embed] }).catch(err => { })
    }
}
