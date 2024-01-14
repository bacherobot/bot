const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, escapeMarkdown } = require("discord.js")
const bacheroFunctions = require("../../functions")
var elbotStyle = bacheroFunctions.config.getValue("bachero", "elbotStyleInErrors")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("unban")
		.setDescription("Débannir un membre du serveur")
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addStringOption(option => option
			.setName("membre")
			.setDescription("Le nom d'utilisateur du membre à débannir")
			.setRequired(true))
		.addBooleanOption(option => option
			.setName("avertir")
			.setDescription("Si le membre doit être averti en message privé")
			.setRequired(true))
		.addStringOption(option => option
			.setName("raison")
			.setDescription("La raison du débannisement")
			.setRequired(false)),

	async execute(interaction){
		// Récupérer le nom d'utilisateur du membre
		var member = interaction.options.getString("membre")
		if(member.startsWith("@")) member = member.slice(1)
		if(!member) return interaction.reply({ content: "Le membre n'existe pas.", ephemeral: true }).catch(err => {})

		// Obtenir le membre dans la liste des bannis
		const bannedUsers = await interaction.guild.bans.fetch().catch(err => {})
		member = bannedUsers.find(user => user?.user?.username?.toLowerCase() == member?.toLowerCase() || user?.user?.tag?.toLowerCase() == member?.toLowerCase() || user?.user?.displayName?.toLowerCase() == member?.toLowerCase())
		if(!member) return interaction.reply({ content: "Le membre ne semble pas être banni sur ce serveur.", ephemeral: true }).catch(err => {})

		// Obtenir la raison de débannisement
		var reason = interaction.options.getString("raison")
		if (!reason) reason = "Aucune raison fournie"

		// Avatar de celui qui a executé la commande
		const avatar = interaction.user.avatarURL({ format: "png", dynamic: true, size: 512 })

		// Tenter de débannir le membre
		var isUnbanPossible = await interaction.guild.members.unban(member.user.id, reason).catch(err => { return { err: err } })
		if(isUnbanPossible.err) return await bacheroFunctions.report.createAndReply("débannissement", isUnbanPossible.err || isUnbanPossible, { memberId: member?.id, reason }, interaction)

		// Tenter d'envoyer un message privé au membre si l'option est activée
		var isDmImpossible = false
		if (interaction.options.getBoolean("avertir")) {
			// Créé un lien d'invitation
			var invite = await interaction.channel.createInvite().catch(err => {})

			// Faire un embed
			var embed = new EmbedBuilder()
				.setTitle("Bonne nouvelle !")
				.setAuthor({ name: interaction.user.displayName || interaction.user.username, iconURL: avatar })
				.setDescription(`Vous avez été débanni du serveur "${escapeMarkdown(interaction.guild.name)}" ! Vous pouvez revenir sur le serveur en cliquant [ici](https://discord.gg/${invite?.code})).`)
				.setColor(bacheroFunctions.colors.primary)
			if(elbotStyle) embed.setImage("https://github.com/bacherobot/ressources/blob/main/elbot/elbot%20D.png?raw=true")

			// Envoyer le message
			var isDmed = await member.user.send({ embeds: [embed] }).catch(_err => { return false })
			if(!isDmed) isDmImpossible = true
		}

		// Répondre à l'interaction
		var embed = new EmbedBuilder()
			.setTitle("Débannissement")
			.setAuthor({ name: interaction.user.displayName || interaction.user.username, iconURL: avatar })
			.setDescription("J'espère que vous lui ferez un bon accueil à son retour !")
			.setFields([
				{ name: "Membre débanni", value: `<@${member?.user?.id || member}>`, inline: false },
				reason?.length ? { name: "Raison", value: reason, inline: false } : null,
			].filter(Boolean))
			.setColor(bacheroFunctions.colors.primary)
		if(interaction.options.getBoolean("avertir")) embed.setFooter({ text: isDmImpossible ? "Le membre n'a pas pu être prévenu" : interaction.options.getBoolean("avertir") ? "Le membre a été prévenu" : "Vous n'avez pas souhaité prévenir ce membre" })
		await interaction.reply({ embeds: [embed] }).catch(err => {})
	}
}
