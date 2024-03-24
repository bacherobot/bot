const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ContextMenuCommandBuilder, ApplicationCommandType, escapeMarkdown } = require("discord.js")
const { config, report, colors } = require("../../functions")
const alwaysShowMinimal = config.getValue("bachero.module.userinfo", "alwaysShowMinimal")
const disableBadges = config.getValue("bachero.module.userinfo", "disableBadges")
const fetchPronouns = config.getValue("bachero.module.userinfo", "fetchPronouns")
const fetch = require("node-fetch")

// Créé la commande slash
var slashInfo = new SlashCommandBuilder()
	.setName("userinfo")
	.setDescription("Affiche des informations sur le compte de quelqu'un")
	.addUserOption(option => option.setName("user")
		.setDescription("Obtient les informations sur un utilisateur")
		.setRequired(false))
if(alwaysShowMinimal != true) slashInfo.addBooleanOption(option => option.setName("showminimal")
	.setDescription("Affiche moins d'informations, mais est plus rapide")
	.setRequired(false))

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: slashInfo,

	// Définir les infos du menu contextuel
	contextInfo: new ContextMenuCommandBuilder()
		.setName("Afficher les infos")
		.setType(ApplicationCommandType.User),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir l'identifiant de l'utilisateur
		var userId = (await interaction.options.getUser("user"))?.id || interaction.user.id

		// Obtenir l'option pour savoir si on n'affiche que des informations minimales
		if(alwaysShowMinimal == true) var showMinimal = true
		else var showMinimal = await interaction.options.getBoolean("showminimal") || false

		// Obtenir les informations de l'utilisateur
		if(!showMinimal) var userInfo = await fetch(`https://discord-whois.vercel.app/api/getDiscord?discordId=${userId}${disableBadges ? "" : "&showBadges=true"}&requestBotInfo=true`, { headers: { "User-Agent": "BacheroBot (+https://github.com/bacherobot/bot)" } }).then(res => res.json()).catch(err => { return { error: true, message: err } })
		else var userInfo = await interaction.options.getUser("user") || interaction.user

		// Si on a une erreur
		if(userInfo.error) return await report.createAndReply("requête vers l'API de Discord WhoIs", userInfo?.message?.toString() || userInfo, { userId, showBadges: !disableBadges }, interaction)

		// Utiliser les informations fournis par WhoIs
		userInfo = userInfo?.advancedInfo || userInfo

		// Obtenir les pronoms de l'utilisateur
		if(!showMinimal && !userInfo.bot && fetchPronouns == true) var { pronouns } = await fetch(`https://pronoundb.org/api/v1/lookup?platform=discord&id=${userId}`).then(res => res.json()).catch(err => { return "" }); else var pronouns = ""
		var listPronounsFR = {
			"unspecified": "",
			"hh": "he/him",
			"hi": "he/it",
			"hs": "he/she",
			"ht": "he/they",
			"ih": "it/him",
			"ii": "it/its",
			"is": "it/she",
			"it": "it/they",
			"shh": "she/he",
			"sh": "she/her",
			"si": "she/it",
			"st": "she/they",
			"th": "they/he",
			"ti": "they/it",
			"ts": "they/she",
			"tt": "they/them",
			"any": "", "other": "", "ask": "", "avoid": ""
		}
		pronouns = listPronounsFR[pronouns] || ""

		// Créer une ligne de boutons (pour les actions principales)
		var date = Date.now()
		var row
		if(!showMinimal){
			row = new ActionRowBuilder().addComponents(new ButtonBuilder()
				.setCustomId(`userinfo-nameHistory-${date}`)
				.setStyle(ButtonStyle.Primary)
				.setLabel("Historique de pseudos"))

			// Si on a réussi à obtenir son lien d'invitation
			if(userInfo?.bot_invite_link) row.addComponents(new ButtonBuilder()
				.setURL(userInfo?.bot_invite_link)
				.setStyle(ButtonStyle.Link)
				.setLabel("Inviter le bot"))

			// Ajouter les liens personnalisés
			if(userInfo?.links?.length) userInfo?.links.forEach(link => {
				row.addComponents(new ButtonBuilder()
					.setURL(link.url)
					.setStyle(ButtonStyle.Link)
					.setLabel(link.name))
			})
		}

		// Obtenir la liste des badges
		// Préparer la liste
		var badges = []

		// Liste de ceux qui existent de base dans Discord
		var discordIntegratedBadge = {
			"Discord_Employee": { name: "Employée Discord", emoji: "<:EmployeDiscord:1008809296290648159>" },
			"Partnered_Server_Owner": { name: "Partenaire Discord", emoji: "<:PartenaireDiscord:1008809311847317554>" },
			"HypeSquad_Events": { name: "Événements Hypesquad", emoji: "<:vnementsHypesquad:1008809301076365382>" },
			"Bug_Hunter_Level_1": { name: "Chasseur de bug niveau 1", emoji: "<:Chasseurdebugniveau1:1008809274631270410>" },
			"House_Bravery": { name: "Hypesquad Bravery", emoji: "<:HypesquadBravery:1008809305253875803>" },
			"House_Brilliance": { name: "Hypesquad Brillance", emoji: "<:HypesquadBrillance:1008809306998718577>" },
			"House_Balance": { name: "Hypersquad Balance", emoji: "<:HypersquadBalance:1008809302737293404>" },
			"Early_Supporter": { name: "Soutien de la première heure", emoji: "<:Soutiendelapremireheure:1008809315882254347>" },
			"Bug_Hunter_Level_2": { name: "Chasseur de bug niveau 2", emoji: "<:Chasseurdebugniveau2:1008809277093326848>" },
			"Early_Verified_Bot_Developer": { name: "Développeur de bot certifié de la première heure", emoji: "<:Dveloppeurdebotcertifidelapremir:1008809288141111417>" },
			"Discord_Certified_Moderator": { name: "Modérateur certifié", emoji: "<:Modrateurcertifi:1008809309649514506>" }
		}

		// Et tout ajouter
		if(userInfo?.badges?.discord) for(var i = 0; i < userInfo?.badges?.discord.length; i++){
			if(discordIntegratedBadge[userInfo?.badges?.discord[i]]?.emoji) badges.push({ from: "discord", emoji: discordIntegratedBadge[userInfo?.badges?.discord[i]].emoji, name: discordIntegratedBadge[userInfo?.badges?.discord[i]].name, link: discordIntegratedBadge[userInfo?.badges?.discord[i]].link })
		}
		if(userInfo?.badges?.replugged_developer) badges.push({ from: "replugged", name: "Développeur Replugged", emoji: "<:DveloppeurReplugged:1008809294189305896>", link: "https://replugged.dev/" })
		if(userInfo?.badges?.replugged_staff) badges.push({ from: "replugged", name: "Équipe Replugged", emoji: "<:quipeReplugged:1008809298442326037>", link: "https://replugged.dev/" })
		if(userInfo?.badges?.replugged_support) badges.push({ from: "replugged", name: "Support Replugged", emoji: "<:SupportReplugged:1008809321368404150>", link: "https://replugged.dev/" })
		if(userInfo?.badges?.replugged_contributor) badges.push({ from: "replugged", name: "Contributeur Replugged", emoji: "<:ContributeurReplugged:1008809284932489226>", link: "https://replugged.dev/" })
		if(userInfo?.badges?.replugged_translator) badges.push({ from: "replugged", name: "Traducteur Replugged", emoji: "<:TraducteurReplugged:1008809327156543568>", link: "https://i18n.replugged.dev/" })
		if(userInfo?.badges?.replugged_hunter) badges.push({ from: "replugged", name: "Chasseur de Bug Replugged", emoji: "<:ChasseurdeBugReplugged:1008809278884294716>", link: "https://replugged.dev/" })
		if(userInfo?.badges?.replugged_early) badges.push({ from: "replugged", name: "Utilisateur Replugged de la première heure", emoji: "<:UtilisateurRepluggeddelapremireh:1008809329677320303>", link: "https://replugged.dev/" })
		if(userInfo?.badges?.replugged_booster) badges.push({ from: "replugged", name: "Replugged Server Booster", emoji: "<:RepluggedServerBooster:1008809313818660864>", link: "https://replugged.dev/" })
		if(userInfo?.badges?.aliucord_contributor) badges.push({ from: "aliucord", name: "Contributeur Aliucord", emoji: "<:ContributeurAliucord:1008809283435118624>", link: "https://github.com/Aliucord/Aliucord" }) // ouais il manque le aliucord développeur mais j'ai pas trouvé l'icône :/
		if(userInfo?.badges?.bachero_ogSupporter) badges.push({ from: "bachero", name: "OG Supporter", emoji: "<:BacheroLogo:1046404634023047240>", link: "https://bachero.johanstick.fr" })
		if(userInfo?.badges?.custom?.emoji && userInfo?.badges?.custom?.name) badges.push({ from: "discord-whois", emoji: userInfo?.badges?.custom?.emoji, name: userInfo?.badges?.custom?.name })

		// Fetch le membre du serveur
		if(interaction.guild) var memberInfo = await interaction.guild.members.fetch(userId).catch(err => { return null }); else var memberInfo = null

		// Si on a pas l'URL de l'avatar ou de la bannière
		if(!userInfo?.avatar_url && userInfo?.avatar) userInfo.avatar_url = `https://cdn.discordapp.com/avatars/${userInfo.id}/${userInfo.avatar}?size=512`
		if(!userInfo?.banner_url && userInfo?.banner) userInfo.banner_url = `https://cdn.discordapp.com/banners/${userInfo.id}/${userInfo.banner}?size=512`

		// Définir la description
		var description = ""
		if(badges?.length) description += badges.map(b => b.link ? `[${b.emoji} ${b.name}](${b.link})` : `${b.emoji} ${b.name}`).join("\n")
		if(userInfo?.bio && !badges?.length) description += `${userInfo.bio}`; else if(userInfo?.bio && badges?.length) description += `\n\n${userInfo.bio}` // N'est disponible que sur les bots

		// Créé un embed contenant toute les informations
		var embed = new EmbedBuilder()
			.setTitle(`${userInfo?.global_name || userInfo?.globalName ? userInfo.global_name || userInfo.globalName : ""} ${userInfo?.global_name || userInfo?.globalName ? "(" : ""}${userInfo?.discriminator == "0" ? `@${userInfo?.username}` : `${userInfo.username}#${userInfo.discriminator}`}${userInfo?.global_name || userInfo?.globalName ? ")" : ""} ${pronouns?.length ? `*(${pronouns})*` : ""}`)
			.setColor(colors.primary)
		if(!showMinimal) embed.setFooter({ text: `Informations obtenues via Discord WhoIs${pronouns?.length ? " et PronounDB" : ""}` })
		if(userInfo.avatar_url) embed.setThumbnail(userInfo.avatar_url)
		if(userInfo.banner_url) embed.setImage(userInfo.banner_url)
		if(badges?.length || userInfo?.bio) embed.setDescription(description)

		// Créé une liste de champs à ajouter (et l'ajouter à l'embed du coup)
		var listFields = [
			{ name: "Bot ?", value: userInfo.bot ? "Oui" : "Non", inline: true },
			memberInfo?.nickname ? { name: "Surnom", value: escapeMarkdown(memberInfo.nickname), inline: true } : null,
			memberInfo?._roles?.length ? { name: `${memberInfo?._roles?.length?.toString()} rôle${memberInfo?._roles?.length > 1 ? "s" : ""}`, value: `${memberInfo?._roles?.length == 1 ? '' : '+ haut : '}\`${memberInfo?.roles?.cache.sort((a, b) => b.position - a.position)?.map(role => role.name)[0]?.replace(/`/g, "")}\``, inline: true } : null,
			{ name: "Identifiant", value: `\`${userInfo.id.replace(/`/g, "")}\``, inline: true },
			userInfo?.created_at_unix ? { name: "Création du compte", value: `<t:${Math.round(userInfo.created_at_unix / 1000)}:f>`, inline: true } : null,
			memberInfo?.joinedTimestamp ? { name: "Arrivée ici", value: `<t:${Math.round(memberInfo.joinedTimestamp / 1000)}:f>`, inline: true } : null,
			userInfo?.tags?.length ? { name: "Tags", value: userInfo?.tags?.map(tag => `\`${escapeMarkdown(tag.replace(/`/g, ""))}\``)?.join(", "), inline: true } : null,
		]
		embed.addFields(listFields.filter(field => field != null))

		// Quand quelqu'un clique sur le bouton pour l'historique de pseudos
		if(row){
			const filter = i => i.customId == `userinfo-nameHistory-${date}`
			const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 999999 })
			collector.on("collect", async i => {
				// Arrêter le collecteur et mettre en defer
				collector.stop()
				if(await i.deferReply().catch(err => { return "stop" }) == "stop") return

				// Désactiver le bouton qui permet d'afficher ce message (puisque le collecteur est arrêté)
				row.components[0].setDisabled(true)

				// Récupérer la liste des pseudos
				var usernameHistory = await fetch(`https://discord-whois.vercel.app/api/getUsernameHistory?discordId=${userId}`, { headers: { "User-Agent": "BacheroBot (+https://github.com/bacherobot/bot)" } }).then(res => res.json()).catch(err => { return { error: true, message: err } })

				// Si on a une erreur
				if(usernameHistory.error){
					if(usernameHistory.message == "L'historique de pseudo est vide") return i.update({ content: usernameHistory.message, embeds: [], components: [] })
					else return await report.createAndReply("obtention de l'historique de pseudos", usernameHistory?.message?.toString() || usernameHistory, { userId }, i)
				}

				// Utiliser les informations que l'API nous renvoie
				usernameHistory = usernameHistory.advancedInfo

				// Créé un embed
				var embed = new EmbedBuilder()
				embed.setTitle("Historique de pseudos")
				embed.setDescription(`${usernameHistory.map(u => `<t:${Math.round(u.date / 1000)}:f> | ${escapeMarkdown(u.username)}`).join("\n").slice(0, 3800)}\n\n> L'historique de pseudos se base sur le moment auquel [Discord WhoIs](https://bachero.johanstick.fr/blog/discord-whois) a été utilisé pour obtenir les informations de l'utilisateur.\n\n> À chaque fois qu'un utilisateur obtient les informations d'un autre utilisateur, le pseudo sera modifié dans l'historique.`)
				embed.setColor(colors.primary)
				embed.setFooter({ text: "Informations obtenues via Discord WhoIs" })

				// Répondre et modifier l'ancienne réponse pour enlever le bouton
				if(await i.editReply({ embeds: [embed] }).catch(err => { return "stop" }) == "stop") return
				await interaction.editReply({ components: [row] }).catch(err => { return "stop" })
			})
		}

		// Répondre à l'interaction
		if(row) interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
		else interaction.editReply({ embeds: [embed] }).catch(err => {})
	}
}