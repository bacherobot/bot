const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const bacheroFunctions = require("../../functions")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("lock")
		.setDescription("Empêche le rôle @everyone de parler dans ce salon")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.setDMPermission(false)
		.addStringOption(option => option
			.setName("raison")
			.setDescription("La raison du verrouillage")
			.setRequired(false)),

	async execute(interaction){
		// On defer l'interaction
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir des infos
		const reason = interaction.options.getString("raison")
		const channel = interaction.channel
		const role = interaction.guild.roles.cache.find(role => role.name === "@everyone")
		const channelPermissionOverwrites = channel.permissionOverwrites.cache.get(role.id)

		// Si le salon est déjà verouillé
		if (channelPermissionOverwrites?.deny?.has("SendMessages")) return interaction.reply({ content: `Le salon ${channel} est déjà verouillé.`, ephemeral: true }).catch(err => {})

		// Sinon on le verrouille
		try {
			await channel.permissionOverwrites.edit(role, { SendMessages: false })
			var embed = new EmbedBuilder()
				.setAuthor({ name: interaction.user.displayName || interaction.user.username, iconURL: interaction.user.avatarURL({ format: "png", dynamic: true, size: 512 }) })
				.setTitle("Verrouillage du salon")
				.setDescription(reason ? `Le salon ${channel} a été verrouillé pour la raison suivante : **${reason}**` : `Le salon ${channel} a été verrouillé.`)
				.setColor(bacheroFunctions.colors.primary)
			await interaction.reply({ embeds: [embed] }).catch(err => {})
		} catch (err) {
			return bacheroFunctions.report.createAndReply("verrouillage du salon", err.err || err, {}, interaction)
		}
	}
}
