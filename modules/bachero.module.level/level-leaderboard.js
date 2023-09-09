const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.level")
const escape = require("markdown-escape")

// Options de la configuration
const showMaxUsersInLeaderboard = bacheroFunctions.config.getValue("bachero.module.level", "showMaxUsersInLeaderboard") || false

// Mettre en cache l'embed du classement
var global_cacheLeaderboard = {}
var guild_cacheLeaderboard = {}

// Fonction pour ajouter un espace tous les 3 caractères
function addSpaceNumbers(str){
	return str.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

// Fonction pour remplacer les espaces qui se suivent
function replaceMultipleSpaces(str){
	return str.replace(/\s\s+/g, " ")
}

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("level-leaderboard")
		.setDescription("Affiche le classement des niveaux, sur ce serveur et sur tous les serveurs."),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Identifiant du serveur et de l'utilisateur
		var guildId = interaction?.guild?.id
		var userId = interaction.user.id

		// Si on a l'id du serveur, on obtient les infos de ce serveur
		if(guildId) var guildInfo = (await bacheroFunctions.database.get(database, `guild-${guildId}`)) || { globalLeaderboard: true } // Si on a pas d'infos, on met la valeur par défaut

		// On affiche le classement interserveur ?
		if(!guildInfo.globalLeaderboard && guildId) var showGlobal = false
		else var showGlobal = true

		// Vérifier si on a l'embed en cache
		if(
			(showGlobal && global_cacheLeaderboard && global_cacheLeaderboard?.expire > Date.now()) && // si on a l'embed global
			(!guildId || (guildId && guild_cacheLeaderboard?.[guildId] && guild_cacheLeaderboard?.[guildId]?.expire > Date.now())) // et qu'on a celui du serveur
		){
			var embeds = [global_cacheLeaderboard.embed]
			if(guildId) embeds.push(guild_cacheLeaderboard[guildId].embed)
			return interaction.reply({ embeds: embeds }).catch(err => {})
		}

		// Sinon, on defer
		await interaction.deferReply().catch(err => {})

		// Obtenir la base de données entière
		var databaseContent = await bacheroFunctions.database.getAll(database)

		// Pour chaque utilisateur
		var users = []
		for(var data of Object.entries(databaseContent)){
			// Si ça ne commence pas par "user-", on passe
			if(!data[0].startsWith("user-")) continue

			// On ajoute l'utilisateur
			users.push({
				id: data[0],
				global: {
					xp: data?.[1]?.global?.xp,
					level: data?.[1]?.global?.level
				},
				server: {
					xp: data?.[1]?.[`server-${guildId}`]?.xp,
					level: data?.[1]?.[`server-${guildId}`]?.level
				}
			})
		}

		// Faire deux classements, et trier en fonction du nombre d'xp
		if(showGlobal) var global_leaderboard = users.filter(u => u?.global?.xp != undefined).sort((a, b) => {
			if(a?.global?.xp > b?.global?.xp) return -1
			else if(a?.global?.xp < b?.global?.xp) return 1
			else return 0
		})
		if(guildId) var server_leaderboard = users.filter(u => u?.server?.xp != undefined).sort((a, b) => {
			if(a?.server?.xp > b?.server?.xp) return -1
			else if(a?.server?.xp < b?.server?.xp) return 1
			else return 0
		})

		// On obtient l'utilisateur
		var userDb = (await bacheroFunctions.database.get(database, `user-${userId}`)) || {}

		// On obtient le rang de l'utilisateur
		if(showGlobal) var global_userRank = global_leaderboard.findIndex(u => u.id == `user-${userId}`) + 1
		if(guildId) var server_userRank = server_leaderboard.findIndex(u => u.id == `user-${userId}`) + 1

		// On génère l'embed interserveur
		var global_embed
		if(showGlobal){
			var global_leaderboard_embed = []
			for(var i = 0; i < global_leaderboard.slice(0, showMaxUsersInLeaderboard ? 24 : 12).length; i++){
				var user = await bacheroFunctions.parseUserFromString(global_leaderboard[i].id.split("-")[1])

				global_leaderboard_embed.push({
					name: `${i + 1}. ${user?.globalName ? `${escape(replaceMultipleSpaces(user.globalName))} (@` : ""}${user?.tag ? escape(replaceMultipleSpaces(user.tag)) : ""}${user?.globalName ? ")" : ""}`,
					value: `- Niveau ${global_leaderboard[i]?.global?.level || 0}\n- ${addSpaceNumbers(global_leaderboard[i]?.global?.xp || 0)} XP`,
					inline: true
				})
			}
			var global_embed = new EmbedBuilder()
				.setTitle("Classement - interserveur")
				.setFields(global_leaderboard_embed)
				.setFooter({ text: `Votre rang : ${global_userRank} / ${global_leaderboard.length} • ${userDb?.global?.level ? `Niveau ${userDb?.global?.level}` : "Aucun niveau"}, avec ${userDb?.global?.xp ? `${addSpaceNumbers(userDb?.global?.xp)} XP` : "Aucune XP"}` })
				.setColor(bacheroFunctions.colors.primary)
		}

		// On génère l'embed sur ce serveur
		var server_embed
		if(guildId){
			var server_leaderboard_embed = []
			for(var i = 0; i < server_leaderboard.slice(0, showMaxUsersInLeaderboard ? 24 : 12).length; i++){
				var user = await bacheroFunctions.parseUserFromString(server_leaderboard[i].id.split("-")[1])

				server_leaderboard_embed.push({
					name: `${i + 1}. ${user?.globalName ? `${escape(replaceMultipleSpaces(user.globalName))} (@` : ""}${user?.tag ? escape(replaceMultipleSpaces(user.tag)) : ""}${user?.globalName ? ")" : ""}`,
					value: `- Niveau ${server_leaderboard[i]?.server?.level || 0}\n- ${addSpaceNumbers(server_leaderboard[i]?.server?.xp || 0)} XP`,
					inline: true
				})
			}
			server_embed = new EmbedBuilder()
				.setTitle("Classement - ce serveur")
				.setFields(server_leaderboard_embed)
				.setFooter({ text: `Votre rang : ${server_userRank} / ${server_leaderboard.length} • ${userDb?.[`server-${guildId}`]?.level ? `Niveau ${userDb?.[`server-${guildId}`]?.level}` : "Aucun niveau"}, avec ${userDb?.[`server-${guildId}`]?.xp ? `${addSpaceNumbers(userDb?.[`server-${guildId}`]?.xp)} XP` : "Aucune XP"}` })
				.setColor(bacheroFunctions.colors.primary)
		}

		// On met en cache
		if(showGlobal) global_cacheLeaderboard = {
			embed: global_embed,
			expire: Date.now() + (1000 * 60 * 2) // 2 minutes
		}
		if(guildId) guild_cacheLeaderboard[guildId] = {
			embed: server_embed,
			expire: Date.now() + (1000 * 60 * 2) // 2 minutes
		}

		// On envoie l'embed
		var embeds = []
		if(showGlobal) embeds.push(global_embed)
		if(guildId) embeds.push(server_embed)
		interaction.editReply({ embeds: embeds }).catch(err => {})
	}
}