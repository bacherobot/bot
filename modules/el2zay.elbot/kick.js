const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js")
const bacheroFunctions = require("../../functions")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("kick")
		.setDescription("Expulse un membre de votre serveur")
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
		.setDMPermission(false)
		.addUserOption(option => option
			.setName("membre")
			.setDescription("Le membre à expulser")
			.setRequired(true))
		.addBooleanOption(option => option
			.setName("avertir")
			.setDescription("Si le membre doit être averti en message privé")
			.setRequired(true))
		.addStringOption(option => option
			.setName("raison")
			.setDescription("La raison du kick")
			.setMaxLength(1900)
			.setRequired(false)),

	async execute(interaction){
		// Obtenir le membre
		const member = (await interaction.options.getUser("membre"))
		if(!member?.id) return interaction.reply({ content: "Le membre n'existe pas.", ephemeral: true })
		const memberId = member.id

		// Obtenir des infos et defer l'interaction
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return
		var reason = interaction.options.getString("raison")
		if(!reason) reason = "Aucune raison fournie"

		// Si le membre est l'owner
		if(memberId == interaction.guild.ownerId) return interaction.editReply({ content: "Tu ne peux pas exclure le propriétaire du serveur.", ephemeral: true }).catch(err => {})

		// On vérifie si l'utilisateur est tjr sur le serveur
		var _member = interaction.guild.members.cache.get(memberId)
		if(!_member) return interaction.editReply({ content: "Le membre n'est plus sur le serveur.", ephemeral: true }).catch(err => {})

		// Avatar de celui qui a executé la commande
		const avatar = interaction.user.avatarURL({ format: "png", dynamic: true, size: 512 })

		// On tente d'avertir l'utilisateur
		var isDmImpossible = false // on vérifie si on peut envoyer le dm au gars
		if (interaction.options.getBoolean("avertir")) {
			// Faire l'embed
			embed = new EmbedBuilder()
				.setTitle("Exclusion")
				.setAuthor({ name: interaction.user.displayName || interaction.user.username, iconURL: avatar })
				.setDescription(`Un modérateur a frappé ! Raison : ${reason}`)
				.setColor(bacheroFunctions.colors.primary)
				.setImage("https://media.tenor.com/5JmSgyYNVO0AAAAS/asdf-movie.gif")
				.setFooter({ text: `Tu peux toujours revenir sur le serveur "${interaction.guild.name}"` })

			// DM le gars
			var isDmed = await member.send({ embeds: [embed] }).catch(err => { return false })
			if (!isDmed) isDmImpossible = true
		}

		// Tenter d'exclure le membre
		var isKickPossible = await interaction.guild.members.kick(member, { reason: reason }).catch(err => { return { err: err } })
		if(isKickPossible.err){
			// On re-dm le gars
			if(!isDmImpossible) await member.send({ content: "Au final on a pas pu t'exclure 💀💀" }).catch(err => {})

			// On retourne un rapport d'erreur
			return bacheroFunctions.report.createAndReply("exclusion", isKickPossible.err || isKickPossible, {}, interaction)
		}

		// On refait un embed, et on l'envoie dans le salon
		var embed = new EmbedBuilder()
			.setTitle("Exclusion")
			.setAuthor({ name: interaction.user.displayName || interaction.user.username, iconURL: avatar })
			.setDescription("Un modérateur a frappé !")
			.setColor(bacheroFunctions.colors.primary)
			.setThumbnail("https://github.com/bacherobot/ressources/blob/main/elbot/kick.png?raw=true")
			.addFields(
				{ name: "Membre expulsé", value: `${member.discriminator == "0" ? member.username : member.tag} (<@${memberId}>)` },
				{ name: "Raison", value: reason },
			)

		// On précise si le membre a pu être averti
		if(interaction.options.getBoolean("avertir")) embed.setFooter({ text: isDmImpossible ? "Le membre n'a pas pu être prévenu" : interaction.options.getBoolean("avertir") ? "Le membre a été prévenu" : "Vous n'avez pas souhaité prévenir ce membre" })

		// Répondre avec l'embed
		return interaction.editReply({ embeds: [embed] }).catch(err => {})
	}
}
