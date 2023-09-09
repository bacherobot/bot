const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, version } = require("discord.js")
const { readFile } = require("fs")
const { totalmem } = require("os")
const { fromBytes } = require("@tsmx/human-readable")
const bacheroFunctions = require("../../functions")
var bacheroVersion = bacheroFunctions.package.version
var hideStartTime = bacheroFunctions.config.getValue("bachero.module.botInfo", "hideStartTime")
var hideDiscordStats = bacheroFunctions.config.getValue("bachero.module.botInfo", "hideDiscordStats")
var hideBacheroStats = bacheroFunctions.config.getValue("bachero.module.botInfo", "hideBacheroStats")
var hideRam = bacheroFunctions.config.getValue("bachero.module.botInfo", "hideRam")
var hideVersions = bacheroFunctions.config.getValue("bachero.module.botInfo", "hideVersions")
var hideSystem = bacheroFunctions.config.getValue("bachero.module.botInfo", "hideSystem")
var botClient

// Informations mises dans le cache
var cache = {}

// Fonction pour obtenir le nom de l'OS (détaillé)
if(!hideSystem){
	if(process.platform == "linux"){
		readFile("/etc/os-release", "utf8", (err, data) => {
			// En cas d'erreur, retourner "Linux"
			if(err) return "Linux"

			// "parse" en JSON
			const lines = data.split("\n")
			const releaseDetails = {}
			lines.forEach(line => {
				const words = line.split("=")
				releaseDetails[words[0]?.trim()?.toLowerCase()] = words[1]?.trim()?.replace(/"/g, "")?.replace(/`/g, "")
			})

			// Enregistrer le nom de la distro, ou juste "Linux"
			if(releaseDetails.pretty_name && releaseDetails.home_url) cache.os = { expire: -1, value: `[${releaseDetails.pretty_name}](${releaseDetails.home_url})` }
			else if(releaseDetails.pretty_name && !releaseDetails.home_url) cache.os = { expire: -1, value: releaseDetails.pretty_name }
			else if(releaseDetails.id) cache.os = { expire: -1, value: `Linux (${releaseDetails.id})` }
			else cache.os = { expire: -1, value: "Linux" }
		})
	}
	else cache.os = { expire: -1, value: (process.platform == "win32" ? (require("os").version() || process.platform) : process.platform.replace("darwin", "macOS").replace("android", "Android")) }
}

// Ajouter quelques informations dans le cache de façon permanente
if(!hideVersions) cache.nodejsVersion = { expire: -1, value: process.version } // process.version rajoute automatiquement le "v" avant la version
if(!hideVersions) cache.discordjsVersion = { expire: -1, value: `[v${version}](https://github.com/discordjs/discord.js/releases/tag/${version})` }
if(!hideVersions) cache.bacheroVersion = { expire: -1, value: `[v${bacheroVersion}](https://github.com/bacherobot/bot/releases/tag/${bacheroVersion})` }
if(!hideSystem) cache.arch = { expire: -1, value: process.arch }

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("botinfo")
		.setDescription(`Fournis des informations sur ${bacheroFunctions.config.getValue("bachero", "botName")}`),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Obtenir le client du bot
		if(!botClient) botClient = bacheroFunctions.botClient.get()

		// Ajouter d'autres valeurs dans le cache (permanent)
		if(!cache.pingCommandExist) cache.pingCommandExist = { expire: -1, value: bacheroFunctions.modules.allCommands().has("ping") }
		if(!cache.bacheroModules && !hideBacheroStats) cache.bacheroModules = { expire: -1, value: bacheroFunctions.modules.allModulesDetails().size }
		if(!cache.bacheroCommands && !hideBacheroStats) cache.bacheroCommands = { expire: -1, value: bacheroFunctions.modules.allCommands().size }
		if(!cache.guildCount && !hideDiscordStats) cache.guildCount = { expire: -1, value: botClient?.guilds?.cache?.size }
		if(!cache.membersCount && !hideDiscordStats) cache.membersCount = { expire: -1, value: botClient?.guilds?.cache?.reduce((acc, guild) => acc + guild.memberCount, 0) }

		// Ajouter dans un cache temporaire et court
		if(!hideRam && (!cache.ram || Date.now() > cache.ram?.expire)) cache.ram = { expire: Date.now() + 6000, value: `${fromBytes(process.memoryUsage().heapUsed, "BYTE", "MBYTE")}/${fromBytes(totalmem(), "BYTE", "MBYTE")}` }

		// Créer un embed pour afficher les informations
		var embed = new EmbedBuilder()
			.setTitle(`Informations sur ${bacheroFunctions.config.getValue("bachero", "botName")}${bacheroFunctions.config.getValue("bachero", "botName").trim().toLowerCase() == "bachero" ? "" : " *(par Bachero)*"}`)
			.setColor(bacheroFunctions.colors.primary)
		var listFields = [
			!hideStartTime ? { name: "Dernier démarrage", value: `<t:${Math.round(botClient.readyTimestamp / 1000)}:f>`, inline: true } : null,
			cache.guildCount ? { name: "Statistiques Discord", value: `${cache.guildCount?.value} serveurs, ${cache.membersCount?.value} membres`, inline: true } : null,
			cache.bacheroModules ? { name: "Statistiques Bachero", value: `${cache.bacheroModules?.value} modules, ${cache.bacheroCommands?.value} commandes`, inline: true } : null,
			cache.ram ? { name: "RAM", value: cache.ram?.value || "Inconnu", inline: true } : null,
			cache.nodejsVersion?.value ? { name: "Versions", value: `NodeJS: ${cache.nodejsVersion?.value}\nDiscordJS: ${cache.discordjsVersion?.value}\nBachero: ${cache.bacheroVersion?.value}`, inline: true } : null,
			cache.os?.value ? { name: "Système", value: `${cache.os?.value} [${cache.arch?.value}]`, inline: true } : null,
		]
		embed.addFields(listFields.filter(field => field != null))
		if(!listFields.filter(field => field != null).length) embed.setDescription("Aucune information n'est disponible. Si vous êtes le propriétaire de cette instance, éditer le fichier de configuration de ce module pour activer l'affichage de certaines informations. *vous pouvez également désinstaller ce module*")
		if(cache.pingCommandExist?.value) embed.setFooter({ text: "Le temps de latence peut être obtenu avec la commande /ping" })

		// Ajouter le lien de Bachero dans un bouton
		var row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setURL(`https://discord.com/api/oauth2/authorize?client_id=${botClient.user.id}&permissions=8&scope=bot`)
				.setStyle(ButtonStyle.Link)
				.setLabel("Inviter le bot"),
			new ButtonBuilder()
				.setURL("https://github.com/bacherobot/bot")
				.setStyle(ButtonStyle.Link)
				.setLabel("GitHub"),
			new ButtonBuilder()
				.setURL("https://github.com/bacherobot/bot/issues")
				.setStyle(ButtonStyle.Link)
				.setLabel("Signaler un problème")
		)

		// Répondre avec l'embed
		interaction.reply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}