// Importer quelques librairies
const fs = require('fs')
const path = require('path')
const jsonc = require('jsonc')
const JSONdb = require('simple-json-db')
const quickmongo = require("quickmongo")
const LZString = require('lz-string')
const nanoid = require('nanoid')
const { EventEmitter2 } = require('eventemitter2');
const { EmbedBuilder } = require('discord.js')

// Variable pour savoir si la base de données doit être compressé ou non
var compressDatabase

// Listener pour partager des messages entre modules
var listener = new EventEmitter2({ wildcard: true })

// Liste des cooldowns
var cooldowns = new Map()
var cooldownDb

// Liste des bases de données dans le cache
const databaseList = new Map()

// Liste des configurations (histoire de pas avoir à les charger toutes à la fois)
var cachedConfigs = {}

// Créé une variable qui contiendra le client du bot
var botClient = null

// Obtenir toute la configuration d'un module
function config_getConfig(packageName){
	// Si elle est déjà cachée, on la retourne
	if(cachedConfigs[packageName]) return cachedConfigs[packageName]

	// Sinon, on la charge, cache et retourne
	try {
		var config = fs.readFileSync(path.join(__dirname, 'config', `${packageName}.jsonc`), 'utf8')
		cachedConfigs[packageName] = jsonc.parse(config).config
		return cachedConfigs[packageName]
	} catch (e) {
		return new Error(`Fichier de configuration introuvable/invalide`)
	}
}

// Obtenir une propriété de la configuration d'un module par son nom
function config_getValue(packageName, property){
	// Obtenir la configuration entière du module
	var config = config_getConfig(packageName)

	// Si elle n'existe pas, on retourne une erreur
	if(config instanceof Error) return config

	// Retourner la valeur demandée
	return config.find(x => x.name == property)?.value
}

// Vider le cache des configurations
function config_clearCache(){
	cachedConfigs = {}
}

// Fonction pour obtenir une BDD
function getDatabase(packageName){
	// Si elle existe déjà, on la retourne
	if(databaseList.has(packageName)) return databaseList.get(packageName)

	// Si on veut une base de données MongoDB
	if(config_getValue('bachero', 'databaseType') == 'mongodb'){
		// Créé la base de données
		var database = new quickmongo.Database(process.env.MONGODB_URL.replace('%DBNAME%', packageName.replace(/\./g, '-')))

		// Retourne la base de données quand elle est prête
		databaseList.set(packageName, database)
		return database
	}
	// Sinon, go sur du JSON par défaut
	else {
		// Si le dossier database n'existe pas, le créer (de même pour le fichier)
		if(!fs.existsSync(path.join(__dirname, 'database'))) fs.mkdirSync(path.join(__dirname, 'database'))
		if(!fs.existsSync(path.join(__dirname, 'database', `${packageName}.json`))) fs.writeFileSync(path.join(__dirname, 'database', `${packageName}.json`), '{}')

		// Sinon, on la crée et on la retourne
		var database = new JSONdb(path.join(__dirname, 'database', `${packageName}.json`))
		databaseList.set(packageName, database)
		return database
	}
}

// Fonction pour obtenir une valeur dans une BDD
async function database_get(database, property){
	// Obtenir la valeur
	var value = await database.get(property)

	// Vérifier si on doit décompresser
	if(!compressDatabase) compressDatabase = config_getValue('bachero', 'compressDatabase')
	if(compressDatabase && value && typeof value == 'string' && value.startsWith('𠂊')){
		try {
			value = LZString.decompress(value.replace('𠂊',''))
		} catch (e) {}
		try {
			value = JSON.parse(value)
		} catch (e) {}
	}

	// Si elle n'existe pas, on retourne une erreur
	if(value instanceof Error) return value
	return value ? value : null
}

// Fonction pour mettre à jour une valeur dans une BDD
async function database_set(database, property, value){
	// Vérifier si on doit compresser
	if(!compressDatabase) compressDatabase = config_getValue('bachero', 'compressDatabase')
	if(compressDatabase && (typeof value == 'string' || typeof value == 'object')) value = `𠂊${LZString.compress((typeof value == 'object' ? JSON.stringify(value) : value))}`

	// Mettre à jour la valeur
	var result = await database.set(property, value)

	// Si la mise à jour a échoué, on retourne une erreur
	if(result instanceof Error) return result
	return null
}

// Fonction pour vérifier si une valeur existe dans une BDD
async function database_has(database, property){
	// Vérifier si la valeur existe
	var result = await database.has(property)

	// Si la valeur n'existe pas, on retourne une erreur
	if(result instanceof Error) return result
	return result ? true : false
}

// Fonction pour supprimer une valeur dans une BDD
async function database_delete(database, property){
	// Supprimer la valeur
	var result = await database.delete(property)

	// Si la suppression a échoué, on retourne une erreur
	if(result instanceof Error) return result
	return null
}

// Fonction pour obtenir la liste des valeurs dans une BDD
async function database_getAll(database){
	// Préparer la liste
	var json = {}

	// Si on utilise quickmongo (valeur .connection existe)
	if(database?.connection){
		var defaultJSON = await database.all()
		defaultJSON.forEach(a => { json[a.ID] = a.data })
	}

	// Sinon on utilise la méthode JSON
	else json = await database.JSON()

	// Vérifier si on doit décompresser
	if(!compressDatabase) compressDatabase = config_getValue('bachero', 'compressDatabase')
	if(compressDatabase){
		for(var key in json){
			value = json[key]
			if(value && typeof value == 'string' && value.startsWith('𠂊')){
				try {
					json[key] = LZString.decompress(json[key].replace('𠂊',''))
				} catch (e) {}
				try {
					json[key] = JSON.parse(json[key])
				} catch (e) {}
			}
		}
	}

	// Retourner le résultat
	return json
}

// Fonction pour parse une mention/identifiant Discord
async function parseUserFromString(string, returnType){
	// Préparer la variable à retourner
	var returnValueId = null

	// Si c'est un utilisateur
	if(typeof string == 'object' && string.id) returnValueId = string.id

	// Si c'est une mention, on l'obtient
	if(!returnValueId && string.startsWith('<@') && string.endsWith('>')){
		returnValueId = string.slice(2, -1)
		if(returnValueId.startsWith('!')) returnValueId = returnValueId.slice(1)
	}

	// Si c'est un identifiant et qu'il existe, on l'obtient
	if(!returnValueId) idMatch = string.match(/^\d+$/)
	if(!returnValueId && idMatch && (await botClient.users.fetch(idMatch[0]))) returnValueId = idMatch[0]

	// Si la valeur n'a pas été trouvée
	if(!returnValueId) return null

	// Retourner la valeur qu'on veut
	if(returnType == 'id') return returnValueId
	if(returnType == 'mention') return `<@${returnValueId}>`
	else return await botClient.users.fetch(returnValueId)
}

// Fonction pour définir un cooldown à un utilisateur
async function setCooldown(cooldownId, userId, cooldownTime){
	// Si la durée est supérieure à 100000 (100 secondes)
	// Utiliser la base de données pour le cooldown (reste présent après un redémarrage du bot)
	if(cooldownTime > 100000){
		// Si cooldownDb n'existe pas, le créé
		if(!cooldownDb) cooldownDb = await getDatabase('persistantCooldown')

		// Ajouter le cooldown
		await database_set(cooldownDb, `${cooldownId}-${userId}`, {
			expireDate: Date.now() + cooldownTime,
			cooldownTime: cooldownTime,
			cooldownId: cooldownId,
			userId: userId,
			persistant: true
		})
	}
	// Sinon, utiliser une map (non-persistant)
	else cooldowns.set(`${cooldownId}-${userId}`, {
		expireDate: Date.now() + cooldownTime,
		cooldownTime: cooldownTime,
		cooldownId: cooldownId,
		userId: userId,
		persistant: false
	})

	// Retourner la durée du cooldown
	return cooldownTime
}

// Fonction pour vérifier si un utilisateur est bloqué par un cooldown
async function checkCooldown(cooldownId, userId){
	// Préparer dans une variable le cooldown
	var cooldown

	// Vérifier dans la map
	if(cooldowns.has(`${cooldownId}-${userId}`)){
		// Obtenir le cooldown
		var cooldown = cooldowns.get(`${cooldownId}-${userId}`)
	}
	// Sinon, vérifier dans la base de données
	else {
		// Si cooldownDb n'existe pas, le créé
		if(!cooldownDb) cooldownDb = await getDatabase('persistantCooldown')

		// Obtenir le cooldown
		var cooldown = await database_get(cooldownDb, `${cooldownId}-${userId}`)
	}

	// Si le cooldown n'existe pas
	if(cooldown instanceof Error) return 0
	if(!cooldown) return 0

	// Sinon, vérifier si il est expiré
	if(cooldown.expireDate < Date.now()){
		// Si le cooldown est persistant, on le supprime
		if(cooldown.persistant) await database_delete(cooldownDb, `${cooldownId}-${userId}`)

		// Sinon, on le supprime du map
		else cooldowns.delete(`${cooldownId}-${userId}`)

		// Et on finir par retourner 0
		return 0
	}

	// Sinon, on retourne le temps restant
	return cooldown.expireDate - Date.now()
}

// Fonction pour supprimer le cooldown d'un utilisateur
async function deleteCooldown(cooldownId, userId, waitForDelete=true){
	// Si il est dans la map, le supprimer
	if(cooldowns.has(`${cooldownId}-${userId}`)){
		cooldowns.delete(`${cooldownId}-${userId}`)
	}
	// Sinon, vérifier dans la base de données
	else {
		if(!cooldownDb) cooldownDb = await getDatabase('persistantCooldown')
		if(waitForDelete) await database_delete(cooldownDb, `${cooldownId}-${userId}`)
		else database_delete(cooldownDb, `${cooldownId}-${userId}`)
	}

	// Retourner true
	return true
}

// Fonction pour répondre à une interaction si la personne est limité par le cooldown
async function checkCooldownAndReply(interaction, cooldownId){
	// Vérifier si la personne est limité
	var cooldownTime = await checkCooldown(cooldownId, interaction.user.id || interaction.author.id)
	if(!cooldownTime) return false

	// Décider si on doit répondre ou modifier
	if(!interaction.replied && !interaction.deferred) interaction.action = interaction.reply
	else interaction.action = interaction.editReply

	// Répondre
	interaction.action({ embeds: [{
		title: "Vous êtes limité",
		description: `Cette commande est limitée à un certain nombre d'utilisations, veuillez patienter jusqu'à <t:${Math.round((Date.now() + cooldownTime) / 1000)}:T> avant de réessayer.`,
		color: parseInt(config_getValue('bachero', 'embedColor').replace('#',''), 16)
	}], ephemeral: true, components: [], content: null })

	// Retourner true
	return true
}

// Fonction pour obtenir un rapport d'erreur
async function report_get(id){
	// Si le système est désactivé
	if(config_getValue('bachero', 'disableReport') == true) return "Le système de rapport d'erreur est désactivé."

	// Obtenir le rapport depuis la BDD
	var report;
	try {
		if(config_getValue('bachero', 'databaseType') == 'mongodb'){
			var db = getDatabase('internalBachero.reports')
			var report = await database_get(db, randomid)
		} else {
			if(!fs.existsSync(path.join(__dirname, 'reports'))) fs.mkdirSync(path.join(__dirname, 'reports'))
			var report = fs.readFileSync(path.join(__dirname, 'reports', `${id}.txt`)).toString()
		}
	} catch (e) {
		return "Ce rapport n'existe pas."
	}

	// Retourner l'identifiant du rapport
	return report
}

// Fonction pour créé un rapport d'erreur
async function report_create(context, error, moreInfos, interaction){
	// Si le système est désactivé
	if(config_getValue('bachero', 'disableReport') == true) return false

	// Préparer les informations facultatives
	if(!error) var error = "Impossible d'obtenir des détails sur l'erreur."
	if(!context) var context = "contexte inconnu"
	if(!moreInfos) var moreInfos = {}

	// Informations facultatives sur l'interaction
	if(!interaction) interaction = {}
	if(interaction) interaction = {
		authorId: interaction?.user?.id || interaction?.author?.id,
		guildId: interaction?.guild?.id,
		channelId: interaction?.channel?.id,
		sourceType: `${interaction?.sourceType} (type: ${interaction?.type})`,
		commandName: interaction?.commandName,
	}

	// Préparer les informations de base
	var randomid = nanoid(14)
	var date = new Date().toLocaleString()

	// Créer le rapport sous forme de texte
	var report = `${randomid} | Rapport (${context}) générée le ${date}.\n\nIdentifiants en rapport avec l'interaction :\n•   Auteur: ${interaction.authorId}\n•   Serveur: ${interaction.guildId}\n•   Salon: ${interaction.channelId}\n•   Source: ${interaction.sourceType}\n•   Nom de la commande: ${interaction.commandName}\n\nInformations supplémentaires apportées par le module :\n   ${JSON.stringify(moreInfos) || moreInfos}\n\n${'='.repeat(15)}\n\n${error.stack || error.message || error.toString() || error}`

	// L'enregistrer dans la BDD
	if(config_getValue('bachero', 'databaseType') == 'mongodb'){
		var db = getDatabase('internalBachero.reports')
		await database_set(db, randomid, report)
	} else {
		if(!fs.existsSync(path.join(__dirname, 'reports'))) fs.mkdirSync(path.join(__dirname, 'reports'))
		fs.writeFileSync(path.join(__dirname, 'reports', `${randomid}.txt`), report)
	}

	// Retourner l'identifiant du rapport
	return randomid
}

// Fonction pour créé un rapport d'erreur et le rapporter
async function report_createAndReply(context, error, moreInfos, interaction){
	// Décider si on doit répondre ou modifier
	if(!interaction.replied && !interaction.deferred) interaction.action = interaction.reply
	else interaction.action = interaction.editReply

	// Si le système est désactivé
	if(config_getValue('bachero', 'disableReport') == true) return interaction.action({ components: [], content: null, embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande (" + context + ") :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(config_getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: true }).catch(err => {})

	// Créer le rapport
	var reportId = await report_create(context, error, moreInfos, interaction)

	// Répondre
	return interaction.action({ components: [], content: null, embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande (" + context + ") :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```\nEn cas de besoin, vous pourrez communiquer l'identifiant `" + reportId + "` au support pour les aider dans la résolution de problème.").setColor(config_getValue('bachero', 'embedColor'))], ephemeral: true })
}

// Exporter les fonctions
module.exports = {
	config: {
		getConfig: config_getConfig,
		getValue: config_getValue,
		_clearCache: config_clearCache,
	},
	botClient: {
		// Utilisation interne, ne pas utiliser _set dans un module
		_set: function(client){
			botClient = client
		},
		get: function(){
			return botClient
		}
	},
	database: {
		getDatabase: getDatabase,
		get: database_get,
		set: database_set,
		has: database_has,
		delete: database_delete,
		getAll: database_getAll,
	},
	cooldown: {
		set: setCooldown,
		check: checkCooldown,
		delete: deleteCooldown,
		checkAndReply: checkCooldownAndReply,
	},
	modules: {
		allModulesDetails: function(){
			return botClient?.allModulesDetails || new Map()
		},
		allCommands: function(){
			return botClient?.commands || new Map()
		},
		allContextsMenus: function(){
			return botClient?.contextsMenus || new Map()
		}
	},
	report: {
		create: report_create,
		createAndReply: report_createAndReply,
		get: report_get,
	},
	message: {
		listener: listener,
		send: function(identifier, content){
			return listener.emit(identifier, content)
		}
	},
	parseUserFromString: parseUserFromString,
}