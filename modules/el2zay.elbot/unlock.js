const { EmbedBuilder, SlashCommandBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Déverouiller ce salon.')
        .setDMPermission(false),

    async execute(interaction) {
        // Déverouiller un salon vérouillé
        const channel = interaction.channel
        const role = interaction.guild.roles.cache.find(role => role.name === '@everyone')
        // Si le salon n'est pas verouillé
        if (channel.permissionOverwrites.cache.get(role.id).deny.has('SendMessages') == false) return interaction.reply({ content: `Le salon ${channel} n'est pas verouillé.`, ephemeral: true }).catch(err => { })
        // Déverouillé le salon
        channel.permissionOverwrites.edit(role, { SendMessages: true })

        const embed = new EmbedBuilder()
            .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ format: 'png', dynamic: true, size: 1024 }) })
            .setTitle('Unlock')
            // Si il y a une raison envoyer Le salon ${channel} a été verrouillé pour la raison suivante : **${reason}** sinon dire qu'aucune raison n'a été donnée
            .setDescription(`Le salon ${channel} a été déverouillé.`)
            .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
            .setFooter({ text: `Profitez en !` })
        interaction.reply({ embeds: [embed] }).catch(err => { })
    }
}
