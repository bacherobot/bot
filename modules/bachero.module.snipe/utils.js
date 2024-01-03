const { escapeMarkdown } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.snipe")
var client

// Cache
var cache
if(global.snipeGuildStatusCache) cache = global.snipeGuildStatusCache
else {
	const NodeCache = require("node-cache")
	cache = new NodeCache()
	global.snipeGuildStatusCache = cache
}

// Empêcher le chargement en double de ce fichier
if(global.snipeUtilsLoaded) return
else global.snipeUtilsLoaded = true

// Fonction pour créer un snipe
async function createSnipe({ guildId, user, type, content }){
	// S'il manque des arguments
	if(!guildId) return bacheroFunctions.showLog("error", "Un module externe a tenté de créer un snipe mais a manqué l'argument \"guildId\"", "create-snipe")
	if(!user) return bacheroFunctions.showLog("error", "Un module externe a tenté de créer un snipe mais a manqué l'argument \"user\"", "create-snipe")
	if(!type) return bacheroFunctions.showLog("error", "Un module externe a tenté de créer un snipe mais a manqué l'argument \"type\"", "create-snipe")
	if(!content) return bacheroFunctions.showLog("error", "Un module externe a tenté de créer un snipe mais a manqué l'argument \"content\"", "create-snipe")

	// Obtenir le status du serveur dans le cache
	var guildStatus = cache.get(guildId)

	// Si la fonctionnalité est désactivée, on ne fait rien
	if(guildStatus && !guildStatus?.enabled) return
	else if(!guildStatus){
		var dbStatus = await bacheroFunctions.database.get(database, `enabled-${guildId}`)
		cache.set(guildId, { enabled: dbStatus }, 1000 * 90) // on enregistre pendant 90 secondes
		if(!dbStatus) return
	}

	// Obtenir le client si on ne l'a pas
	if(!client) client = bacheroFunctions.botClient.get()

	// Enregistrer l'action
	if(!client.snipes) client.snipes = new Map()
	var snipes = client.snipes.get(guildId) || []
	snipes.push({
		type, content,
		timestamp: Date.now(),
		authorId: user.id, authorTag: user.discriminator == "0" ? escapeMarkdown(user.username) : escapeMarkdown(user.tag),
	})

	// Mettre les snipes dans un ordre pour que les plus récents soient en haut
	snipes.sort((a, b) => b.timpestamp - a.timpestamp)

	// Ne garder que les 500 derniers snipes, puis les enregistrer
	if(snipes.length > 500) snipes = snipes.slice(0, 500)
	client.snipes.set(guildId, snipes)
}

// Ecouter quand un module veut créer un snipe
bacheroFunctions.message.listener.on("createSnipe", message => {
	createSnipe(message)
})