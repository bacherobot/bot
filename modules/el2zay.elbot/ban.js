const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ComponentType, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const escape = require("markdown-escape")
var elbotStyle = bacheroFunctions.config.getValue("bachero", "elbotStyleInErrors")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("ban")
		.setDescription("Banni un membre de votre serveur")
		.setDMPermission(false)
		.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
		.addUserOption(option => option
			.setName("membre")
			.setDescription("Le membre a bannir")
			.setRequired(true))
		.addBooleanOption(option => option
			.setName("avertir")
			.setDescription("Si le membre doit être averti en message privé")
			.setRequired(true))
		.addStringOption(option => option
			.setName("raison")
			.setDescription("La raison du ban")
			.setMaxLength(1900)
			.setRequired(false)),

	async execute(interaction){
		// Obtenir le membre
		const member = (await interaction.options.getUser("membre"))
		if(!member?.id) return interaction.reply({ content: "Le membre n'existe pas.", ephemeral: true }).catch(err => {})
		const memberId = member.id

		// Obtenir des infos et defer l'interaction
		var msg = await interaction.deferReply().catch(err => {})
		var reason = interaction.options.getString("raison")
		if(!reason) reason = "Aucune raison fournie"

		// Si le membre est l'owner
		if(memberId == interaction.guild.ownerId) return interaction.editReply({ content: "Tu ne peux pas bannir le propriétaire du serveur.", ephemeral: true }).catch(err => {})

		// Avatar de celui qui a executé la commande
		const avatar = interaction.user.avatarURL({ format: "png", dynamic: true, size: 512 })

		// Créer les boutons de confirmations
		const rowConfirm = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`banCmd-no-${msg.id}`)
				.setLabel("Ouais bon au final non")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`banCmd-yes-${msg.id}`)
				.setLabel("Je suis certain.")
				.setStyle(ButtonStyle.Danger),
		)

		// Si le membre est le bot
		if(memberId == interaction.client.user.id) {
			// Récupérer le nom du bot
			var botName = bacheroFunctions.config.getValue("bachero", "botName") || "Bachero"

			// Faire un embed
			var embed = new EmbedBuilder()
				.setTitle(`Bannissement de ${botName} ?`)
				.setAuthor({ name: interaction.user.displayName || interaction.user.username, iconURL: avatar })
				.setDescription("Es-tu sûr de vouloir me bannir ? 🥲")
				.setColor(bacheroFunctions.colors.primary)
			if(elbotStyle) embed.setFooter({ text: "uhuhuhuhu, ouin ouin" })
			if(elbotStyle) embed.setThumbnail("https://github.com/bacherobot/ressources/blob/main/elbot/elbot%20bsod.jpeg?raw=true")
			await interaction.editReply({ embeds: [embed], components: [rowConfirm] }).catch(err => {}) // répondre avec l'embed

			// Créer le collector
			const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.customId == `banCmd-yes-${msg.id}` || i.customId == `banCmd-no-${msg.id}` })
			collector_confirm.on("collect", async i => {
				// Arrêter le collector
				collector_confirm.stop()

				// Si l'utilisateur ne veut plus ban le bot
				if(i.customId == `banCmd-no-${msg.id}`) return i.update({ embeds: [], components: [], content: `Opération annulée ! Merci beaucoup d'utiliser ${botName}.`, ephemeral: true }).catch(err => {})

				// Si l'utilisateur veut ban le bot
				if(i.customId == `banCmd-yes-${msg.id}`) return i.update({ embeds: [], components: [], content: "Discord ne permet pas aux bots de se bannir eux-même", files: [new AttachmentBuilder("https://github-production-user-asset-6210df.s3.amazonaws.com/79168733/264065396-f1e1b689-f2c9-457a-a96a-163386bd3a13.mp4")] }).catch(err => {})
			})

			return
		}

		// On tente d'avertir l'utilisateur
		var isDmImpossible = false // on vérifie si on peut envoyer le dm au gars
		if(interaction.options.getBoolean("avertir")){
			// Faire l'embed
			var embed = new EmbedBuilder()
				.setTitle("Bannissement")
				.setAuthor({ name: interaction.user.displayName || interaction.user.username, iconURL: avatar })
				.setDescription(`Un modérateur du serveur "${escape(interaction.guild.name)}" a frappé ! Raison : ${reason}`)
				.setColor(bacheroFunctions.colors.primary)
			if(elbotStyle) embed.setFooter({ text: "Miskin" })
			if(elbotStyle) embed.setImage("https://media.tenor.com/BeHgpjAGbJEAAAAd/ban-hammer.gif")

			// DM le gars
			var isDmed = await member.send({ embeds: [embed] }).catch(err => { return false })
			if(!isDmed) isDmImpossible = true
		}

		// On bannit l'utilisateur
		var isBanPossible = await interaction.guild.members.ban(member, { reason: reason }).catch(err => { return { err: err } })
		if(isBanPossible.err && memberId != interaction.client.user.id){
			// On re-dm le gars
			if(!isDmImpossible) await member.send({ content: "Au final on a pas pu te bannir 💀💀" }).catch(err => {})

			// On retourne un rapport d'erreur
			return bacheroFunctions.report.createAndReply("bannissement", isBanPossible.err || isBanPossible, {}, interaction)
		}

		// On refait un embed, et on l'envoie dans le salon
		var embed = new EmbedBuilder()
			.setTitle("Bannissement")
			.setAuthor({ name: interaction.user.displayName || interaction.user.username, iconURL: avatar })
			.setDescription("Un modérateur a frappé !")
			.setColor(bacheroFunctions.colors.primary)
			.addFields(
				{ name: "Membre banni", value: `${member.discriminator == "0" ? member.username : member.tag} (<@${memberId}>)` },
				{ name: "Raison", value: reason },
			)
		if(elbotStyle) embed.setThumbnail("https://github.com/bacherobot/ressources/blob/main/elbot/ban%20hammer.png?raw=true")

		// On précise si le membre a pu être averti
		if(interaction.options.getBoolean("avertir")) embed.setFooter({ text: isDmImpossible ? "Le membre n'a pas pu être prévenu" : interaction.options.getBoolean("avertir") ? "Le membre a été prévenu" : "Vous n'avez pas souhaité prévenir ce membre" })

		// Répondre avec l'embed
		return interaction.editReply({ content: "", embeds: [embed], components: [] }).catch(err => {})
	}
}
