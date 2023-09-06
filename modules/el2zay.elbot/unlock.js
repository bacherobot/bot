const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const bacheroFunctions = require("../../functions")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("unlock")
		.setDescription("Réautorise le rôle @everyone à parler dans ce salon")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.setDMPermission(false),

	async execute(interaction){
		// On defer l'interaction
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir des infos
		const channel = interaction.channel
		const role = interaction.guild.roles.cache.find(role => role.name === "@everyone")
		const channelPermissionOverwrites = channel.permissionOverwrites.cache.get(role.id)

		// Si le salon n'est pas verouillé
		if(!channelPermissionOverwrites?.deny?.has("SendMessages")) return interaction.reply({ content: `Le salon ${channel} est déjà déverouillé.`, ephemeral: true }).catch(err => {})

		// On le déverrouille
		try {
			await channel.permissionOverwrites.edit(role, { SendMessages: true })
			var embed = new EmbedBuilder()
				.setAuthor({ name: interaction.user.displayName || interaction.user.username, iconURL: interaction.user.avatarURL({ format: "png", dynamic: true, size: 512 }) })
				.setTitle("Déverrouillage du salon")
				.setDescription(`Le salon ${channel} a été déverrouillé.`)
				.setColor(bacheroFunctions.colors.primary)
			await interaction.reply({ embeds: [embed] }).catch(err => {})
		} catch (err) {
			return bacheroFunctions.report.createAndReply("verrouillage du salon", err.err || err, {}, interaction)
		}
	}
}
