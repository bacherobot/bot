const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')
const bacheroFunctions = require('../../functions')
var botName = bacheroFunctions.config.getValue('bachero', 'botName')

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
        if (channel.permissionOverwrites.cache.get(role.id).deny.has('SendMessages')) return interaction.reply({ content: `Le salon ${channel} est déjà verouillé.`, ephemeral: true })
        // Verouillé le salon
        try {
            await channel.permissionOverwrites.edit(role, { SendMessages: false })
            embed = new EmbedBuilder()
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ format: 'png', dynamic: true, size: 1024 }) })
                .setTitle('Lock')
                // Si il y a une raison envoyer Le salon ${channel} a été verrouillé pour la raison suivante : **${reason}** sinon dire qu'aucune raison n'a été donnée
                .setDescription(reason ? `Le salon ${channel} a été verrouillé pour la raison suivante : **${reason}**` : `Le salon ${channel} a été verrouillé.`)
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
            await interaction.reply({ embeds: [embed] }).catch(err => { })
        } catch (err) {
            // Signaler une erreur
            embed = new EmbedBuilder()
                .setTitle("Impossible de verouiller le salon")
                .setDescription("Un problème est survenu lors du verouillage du salon :\n```\n" + (err?.toString()?.replace(/`/g, ' `').replace('Missing Permissions', "Je n'ai pas la permission de gérer ce salon.") || err) + "\n```")
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                .setFooter({ text: `Si vous pensez que ce problème a quelque chose à voir avec ${botName}, n'hésitez pas à le signaler` })
            await interaction.reply({ embeds: [embed], components: [], content: null }).catch(err => { })
        }
    }
}
