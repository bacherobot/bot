const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const bacheroFunctions = require('../../functions')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Verouiller un salon.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('raison')
                .setDescription('La raison ce lock.')
                .setRequired(false)),

    async execute(interaction) {
        const reason = interaction.options.getString('raison')
        const channel = interaction.channel
        const role = interaction.guild.roles.cache.find(role => role.name === '@everyone')

        // Si le salon est déjà verouillé
        if (channel.permissionOverwrites.cache.get(role.id).deny.has('SendMessages')) return interaction.reply({ content: `Le salon ${channel} est déjà verouillé.`, ephemeral: true }).catch(err => { })
        // Verouillé le salon
        channel.permissionOverwrites.edit(role, { SendMessages: false })

        const embed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ format: 'png', dynamic: true, size: 1024 }) })
            .setTitle('Lock')
            // Si il y a une raison envoyer Le salon ${channel} a été verrouillé pour la raison suivante : **${reason}** sinon dire qu'aucune raison n'a été donnée
            .setDescription(reason ? `Le salon ${channel} a été verrouillé pour la raison suivante : **${reason}**` : `Le salon ${channel} a été verrouillé.`)
            .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
        interaction.reply({ embeds: [embed] }).catch(err => { })


    }
}
