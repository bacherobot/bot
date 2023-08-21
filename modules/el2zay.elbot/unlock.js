const { EmbedBuilder, SlashCommandBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')
var botName = bacheroFunctions.config.getValue('bachero', 'botName')

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
        try {
            channel.permissionOverwrites.edit(role, { SendMessages: true })


            const embed = new EmbedBuilder()
                .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ format: 'png', dynamic: true, size: 1024 }) })
                .setTitle('Unlock')
                // Si il y a une raison envoyer Le salon ${channel} a été verrouillé pour la raison suivante : **${reason}** sinon dire qu'aucune raison n'a été donnée
                .setDescription(`Le salon ${channel} a été déverouillé.`)
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                .setFooter({ text: `Profitez en !` })
            await interaction.reply({ embeds: [embed] }).catch(err => { })
        } catch (err) {
            // Signaler une erreur
            embed = new EmbedBuilder()
                .setTitle("Impossible de déverouillage le salon")
                .setDescription("Un problème est survenu lors du déverouillage du salon :\n```\n" + (err?.toString()?.replace(/`/g, ' `').replace('Missing Permissions', "Je n'ai pas la permission de gérer ce salon.") || err) + "\n```")
                .setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
                .setFooter({ text: `Si vous pensez que ce problème a quelque chose à voir avec ${botName}, n'hésitez pas à le signaler` })
            await interaction.editReply({ embeds: [embed], components: [], content: null }).catch(err => { })
        }
    }
}
