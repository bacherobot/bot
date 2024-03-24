// Importer quelques librairies
const fs = require("fs")
const path = require("path")
const jsonc = require("jsonc")
const JSONdb = require("simple-json-db")
const quickmongo = require("quickmongo")
const { customAlphabet } = require("nanoid"), nanoid = customAlphabet("abcdefghiklnoqrstuvyz123456789", 14)
const { EventEmitter2 } = require("eventemitter2")
const { EmbedBuilder } = require("discord.js")
var chalk
if(!process.argv.includes("--optimize")) chalk = require("chalk")

// Listener pour partager des messages entre modules
var listener = new EventEmitter2({ wildcard: true })

// Liste des cooldowns
var cooldowns = new Map()
var cooldownDb

// Liste des bases de données dans le cache
const databaseList = new Map()

// Variables et configurations
var cachedConfigs = {}
var botClient = null
var botName = config_getValue("bachero", "botName")
var showDebugLogsInConsole = config_getValue("bachero", "showDebugLogsInConsole")

// Identifiants propriétaires du bot
var ownerIds = process.env.OWNER_IDS?.split(",")
if(!ownerIds?.length) showLog("warn", "Aucun identifiant de propriétaire n'a été défini dans le fichier .env, certaines fonctionnalités seront manquantes", "no-owner-id"), ownerIds = []
else ownerIds = ownerIds.map(x => x.trim()) || []

// Liste de chemins spécifiques
var foldersPath = {
	config: path.join(__dirname, "config"),
	modules: path.join(__dirname, "modules"),
	node_modules: path.join(__dirname, "node_modules"), // eslint-disable-line
	root: path.join(__dirname)
}

// Fonction pour JSON.stringify en vérifiant les erreurs
function stringify(object){
	var toReturn

	try {
		toReturn = JSON.stringify(object) // 1ère méthode
	} catch (err) {
		showLog("debug", "Impossible de convertir un objet en JSON (1ère méthode)", "json-stringify-error")
		showLog("debug", err, "json-stringify-error")

		try {
			toReturn = JSON.stringify(err, Object.getOwnPropertyNames(err)) // 2ème méthode, j'ai pas assez testé mais ptet ça marchera
		} catch (err) {
			showLog("debug", "Impossible de convertir un objet en JSON (2ème méthode)", "json-stringify-error")
			showLog("debug", err, "json-stringify-error")

			toReturn = toReturn?.toString() // 3ème méthode, aucune idée de si ça marchera
		}
	}

	return toReturn
}

// Obtenir toute la configuration d'un module
/**
	Retourne la configuration entière d'un module par son nom de packet. La configuration de Bachero peut être obtenue avec bachero.

	```js
	var bacheroConfig = bacheroFunctions.config.getConfig('bachero')
	console.log(bacheroConfig.embedColor)
	```

	@param {string} packageName Nom du packet du module
	@returns {object} Configuration du module
*/
function config_getConfig(packageName){
	// Si elle est déjà cachée, on la retourne
	if(cachedConfigs[packageName]) return cachedConfigs[packageName]

	// Sinon, on la charge, cache et retourne
	try {
		var config = fs.readFileSync(path.join(__dirname, "config", `${packageName}.jsonc`), "utf8")
		cachedConfigs[packageName] = jsonc.parse(config).config
		return cachedConfigs[packageName]
	} catch (err) {
		return new Error("Fichier de configuration introuvable/invalide")
	}
}

// Obtenir une propriété de la configuration d'un module par son nom
/**
	Retourne la valeur d'une propriété de la configuration

	```js
	console.log(bacheroFunctions.config.getValue('bachero', 'embedColor'))
	// Note: dans ce cas, vous devriez plutôt utiliser `bacheroFunctions.colors.primary`
	```

	@param {string} packageName Nom du packet du module
	@param {string} property Nom de la propriété à obtenir
	@returns {any} Valeur de la propriété
*/
function config_getValue(packageName, property){
	// Obtenir la configuration entière du module
	var config = config_getConfig(packageName)

	// Si elle n'existe pas, on retourne une erreur
	if(config instanceof Error) return config

	// Retourner la valeur demandée
	return config.find(x => x.name == property)?.value
}

// Vider le cache des configurations
/**
	Vide la liste des configurations en cache. Les configurations seront rechargées aux prochaines lectures.

	@private
	@returns {void}
*/
function config_clearCache(){
	cachedConfigs = {}
}

// Fonction pour obtenir une BDD
/**
	Retourne une base de données par son nom de packet, la réponse pourra faire des opérations.
	L'élément retourné n'est pas le contenu de la base de données, vous pouvez l'obtenir avec `getAll()`.

	```js
	const database = bacheroFunctions.database.getDatabase('com.example.helloworld')
	```

	@param {string} packageName Nom du packet du module
*/
function getDatabase(packageName){
	// Si elle existe déjà, on la retourne
	if(databaseList.has(packageName)) return databaseList.get(packageName)

	// Si on veut une base de données MongoDB
	if(config_getValue("bachero", "databaseType") == "mongodb"){
		// Créé la base de données
		var database = new quickmongo.Database(process.env.MONGODB_URL.replace("%DBNAME%", packageName.replace(/\./g, "-")))

		// Retourne la base de données quand elle est prête
		databaseList.set(packageName, database)
		return database
	}
	// Sinon, go sur du JSON par défaut
	else {
		// Si le dossier database n'existe pas, le créer (de même pour le fichier)
		if(!fs.existsSync(path.join(__dirname, "database"))) fs.mkdirSync(path.join(__dirname, "database"))
		if(!fs.existsSync(path.join(__dirname, "database", `${packageName}.json`))) fs.writeFileSync(path.join(__dirname, "database", `${packageName}.json`), "{}")

		// Sinon, on la crée et on la retourne
		var database = new JSONdb(path.join(__dirname, "database", `${packageName}.json`))
		databaseList.set(packageName, database)
		return database
	}
}

// Fonction pour obtenir une valeur dans une BDD
/**
	Retourne la valeur d'une propriété à partir d'une base de données.

	```js
	const database = bacheroFunctions.database.getDatabase('com.example.helloworld')
	const statistics = bacheroFunctions.database.get(database, 'statistics')
	```

	@param {object} database Base de données à utiliser
	@param {string} property Nom de la propriété à obtenir
	@returns {any} Valeur de la propriété
*/
async function database_get(database, property){
	// On vérifie que la propriété existe
	if(!property) return null
	var hasProperty = await database.has(property)
	if(hasProperty instanceof Error) return hasProperty
	if(!hasProperty) return null

	// Obtenir la valeur
	var value = await database.get(property)

	// Si elle n'existe pas, on retourne une erreur
	if(value instanceof Error) return value
	return value ? value : null
}

// Fonction pour mettre à jour une valeur dans une BDD
/**
	Modifie la valeur d'une propriété dans une base de données.

	```js
	const database = bacheroFunctions.database.getDatabase('com.example.helloworld')
	const statistics = bacheroFunctions.database.get(database, 'statistics')
	bacheroFunctions.database.set(database, 'statistics', statistics + 1)
	```

	@param {object} database Base de données à utiliser
	@param {string} property Nom de la propriété à modifier
	@param {any} value Nouvelle valeur à définir
	@returns {void}
*/
async function database_set(database, property, value){
	// Si on a pas la propriété
	if(!property) return null

	// Mettre à jour la valeur
	var result = await database.set(property, value)

	// Si la mise à jour a échoué, on retourne une erreur
	if(result instanceof Error) return result
	return null
}

// Fonction pour vérifier si une valeur existe dans une BDD
/**
	Vérifie si une propriété existe dans une base de données.

	```js
	const database = bacheroFunctions.database.getDatabase('com.example.helloworld')
	if(await bacheroFunctions.database.has(database, 'statistics')) console.log('La propriété existe !')
	```

	@param {object} database Base de données à utiliser
	@param {string} property Nom de la propriété à vérifier
	@returns {boolean} Si la valeur existe
*/
async function database_has(database, property){
	// Si on a pas la propriété
	if(!property) return null

	// Vérifier si la valeur existe
	var result = await database.has(property)

	// Si la valeur n'existe pas, on retourne une erreur
	if(result instanceof Error) return result
	return !!result
}

// Fonction pour supprimer une valeur dans une BDD
/**
	Supprime une propriété dans une base de données.

	```js
	const database = bacheroFunctions.database.getDatabase('com.example.helloworld')
	if(bacheroFunctions.database.has(database, 'statistics')){
		console.log('Les statistiques existent !')
		bacheroFunctions.database.delete(database, 'statistics')
		console.log('plus maintenant :)')
	}
	```

	@param {object} database Base de données à utiliser
	@param {string} property Nom de la propriété à supprimer
	@returns {void}
*/
async function database_delete(database, property){
	// On vérifie que la propriété existe
	if(!property) return null
	var hasProperty = await database.has(property)
	if(hasProperty instanceof Error) return hasProperty
	if(!hasProperty) return null

	// Supprimer la valeur
	var result = await database.delete(property)

	// Si la suppression a échoué, on retourne une erreur
	if(result instanceof Error) return result
	return null
}

// Fonction pour obtenir la liste des valeurs dans une BDD
/**
	Retourne la liste des valeurs d'une base de données.

	```js
	const database = bacheroFunctions.database.getDatabase('com.example.helloworld')
	const statistics = bacheroFunctions.database.getAll(database)
	```

	@param {object} database Base de données à utiliser
	@returns {object} Liste des valeurs
*/
async function database_getAll(database){
	// Préparer la liste
	var json = {}

	// Tenter d'obtenir les valeurs
	try {
		// Si on utilise quickmongo (valeur .connection existe)
		if(database?.connection){
			var defaultJSON = await database.all()
			defaultJSON.forEach(all => { json[all.ID] = all.data })
		}

		// Sinon on utilise la méthode JSON (simple-json-db)
		else json = await database.JSON()
	} catch (err) {
		showLog("error", "Impossible d'obtenir toutes les valeurs de la base de données (peut-être lié à votre connexion si utilisation de MongoDB)", "database-getall-error")
		showLog("error", err, "database-getall-error", true, true)
	}

	// Retourner le résultat
	return json
}

// Fonction pour parse une mention/identifiant Discord
/**
	Permet de "parser" et "convertir" un utilisateur, s'il est sous la forme d'une mention, d'un utilisateur (discord.js) ou d'un identifiant.

	```js
	var user = await bacheroFunctions.parseUserFromString('277825082334773251')
	console.log(user.username)
	```

	@param {string|object} string Valeur à parser (id, mention, user DiscordJS)
	@param {string} returnType Type de valeur à retourner (id, mention, ou user DiscordJS si non spécifié)
	@returns {string|object} Valeur parsée
*/
async function parseUserFromString(string, returnType){
	// Préparer la variable à retourner
	var returnValueId = null

	// Si c'est un utilisateur
	if(typeof string == "object" && string.id) returnValueId = string.id

	// Si c'est une mention, on l'obtient
	if(!returnValueId && string.startsWith("<@") && string.endsWith(">")){
		returnValueId = string.slice(2, -1)
		if(returnValueId.startsWith("!")) returnValueId = returnValueId.slice(1)
	}

	// Si c'est un identifiant et qu'il existe, on l'obtient
	if(!returnValueId) var idMatch = string.match(/^\d+$/)
	if(!returnValueId && idMatch && (await botClient.users.fetch(idMatch[0]))) returnValueId = idMatch[0]

	// Si la valeur n'a pas été trouvée
	if(!returnValueId) return null

	// Retourner la valeur qu'on veut
	if(returnType == "id") return returnValueId
	if(returnType == "mention") return `<@${returnValueId}>`
	else return await botClient.users.fetch(returnValueId)
}

// Fonction pour afficher quelque chose dans la console
var outputLogsInFile
var showedLog = false
/**
	Affiche un message dans la console, et l'enregistre dans un fichier si cela n'a pas été désactivé par l'administrateur de l'instance.

	```js
	bacheroFunctions.showLog('ok', `L'API n'a rencontré aucun problème`, "example-module-api-ok")
	bacheroFunctions.showLog('info', `L'API a répondu avec succès`, "example-module-api-success")
	bacheroFunctions.showLog('warn', `Un problème a été rencontré avec l'API`, "example-module-api-problem")
	bacheroFunctions.showLog('error', `L'API a rencontré une erreur`, "example-module-api-error")
	```

	@param {string} type Type de message à afficher (ok, info, warn, error)
	@param {string} content Contenu du message à afficher
	@param {string} id Identifiant du message à log, fortement recommandé
	@param {boolean} showInConsole Si le message doit être affiché dans la console
	@param {boolean} hideDetails Si les détails devraient ne pas s'afficher (heure, type)
	@returns {boolean} Si le message a été affiché
*/
function showLog(type, content, id = "noid", showInConsole = true, hideDetails = false){
	// Obtenir le nom du module qui a appelé la fonction
	var callerPath = new Error()?.stack?.split("\n")?.[2]?.split("(")?.[1]?.split(")")?.[0]
	callerPath = callerPath?.split(path.sep)
	var callerModule = `${callerPath[callerPath.length - 2]}/${callerPath[callerPath.length - 1].split(":")[0]}`

	// Si l'identifiant est bloqué
	if(config_getValue("bachero", "logBlockedIds").includes(id)) return false

	// Type à afficher
	var _type = type
	if(chalk) var coloredType = chalk[type == "ok" ? "green" : type == "info" ? "blue" : type == "error" ? "red" : type == "warn" ? "yellow" : "reset"]; else coloredType = type => type
	var type = type ? `[${type.toUpperCase()}]` : ""

	// Obtenir le nom du dossier de Bachero
	var bacheroFolderName = path.join(__dirname).split(path.sep)
	bacheroFolderName = bacheroFolderName[bacheroFolderName.length - 1]

	// Si on doit afficher dans la console, on le fait
	if(showInConsole) console[type == "error" ? "error" : type == "warn" ? "warn" : "log"](((hideDetails ? "" : `${new Date().toLocaleTimeString()} ${coloredType(type)} ${_type == "ok" ? "   " : _type == "error" ? "" : " "} ${chalk ? chalk.gray(`(${callerModule == `${bacheroFolderName}/index.js` ? "Module Loader" : callerModule == `${bacheroFolderName}/functions.js` ? "Bachero Functions" : callerModule})`) : `(${callerModule == `${bacheroFolderName}/index.js` ? "Module Loader" : callerModule == `${bacheroFolderName}/functions.js` ? "Bachero Functions" : callerModule})`} `) + (typeof content == "object" ? stringify(content) : content)))

	// L'ajouter à un fichier de log si on doit le faire
	if(outputLogsInFile == undefined) outputLogsInFile = config_getValue("bachero", "outputLogsInFile")
	if(outputLogsInFile){
		if(!fs.existsSync(path.join(__dirname, "logs"))) fs.mkdirSync(path.join(__dirname, "logs"))
		fs.appendFileSync(path.join(__dirname, "logs", `${new Date().toISOString().slice(0, 10)}.txt`), `${showedLog == false ? "\n\n\n================================ Début des logs ================================\n" : ""}${hideDetails ? "" : `[${new Date().toLocaleTimeString()}] ${type} ${_type == "ok" ? "   " : _type == "error" ? "" : " "} (${callerModule == `${bacheroFolderName}/index.js` ? "Module Loader" : callerModule == `${bacheroFolderName}/functions.js` ? "Bachero Functions" : callerModule})   `}${typeof content == "object" ? stringify(content) : typeof content == "string" ? content.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "") : content}\n`) // l'expression régulière est utilisée pour supprimer les couleurs de la console (caractères ANSI)
	}

	// L'ajouter également aux fichiers de logs machines récentes (et le supprimer s'il existe déjà et qu'on affiche la première log)
	if(!showedLog_debug && !showedLog && fs.existsSync(path.join(__dirname, "logs", "machine-latest.txt"))) fs.unlinkSync(path.join(__dirname, "logs", "machine-latest.txt"))
	fs.appendFileSync(path.join(__dirname, "logs", "machine-latest.txt"), `REGULAR▮${Date.now()}▮${type.replaceAll("▮", "").replaceAll("%JUMP%", "% JUMP%").replaceAll("\n", "%JUMP%")}▮${callerModule == `${bacheroFolderName}/index.js` ? "Module Loader" : callerModule == `${bacheroFolderName}/functions.js` ? "Bachero Functions" : callerModule.replaceAll("▮", "").replaceAll("%JUMP%", "% JUMP%").replaceAll("\n", "%JUMP%")}▮${typeof content == "object" ? stringify(content) : typeof content == "string" ? content.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").replaceAll("▮", "").replaceAll("%JUMP%", "% JUMP%").replaceAll("\n", "%JUMP%") : content.replaceAll("▮", "").replaceAll("%JUMP%", "% JUMP%").replaceAll("\n", "%JUMP%")}\n`)

	// Retourner true
	if(!showedLog) showedLog = true
	return true
}

// Fonction pour afficher une log de debug
var showedLog_debug = false
/**
	Enregistre une information utile à des fins de débogage, elle sera incluse dans les rapports d'erreurs si nécessaire, et l'administrateur d'instance pourra la consulter.

	```js
	var res = await fetch('...').then(res => res.json())
	bacheroFunctions.showDebug('fetch result', res)
	```

	@param {...string} args Eléments à afficher
	@returns {boolean} true
*/
function showDebug(...args){
	// Obtenir le nom du module qui a appelé la fonction
	var callerPath = new Error()?.stack?.split("\n")?.[2]?.split("(")?.[1]?.split(")")?.[0]
	callerPath = callerPath?.split(path.sep)
	var callerModule = `${callerPath[callerPath.length - 2]}/${callerPath[callerPath.length - 1].split(":")[0]}`

	// Obtenir le nom du dossier de Bachero
	var bacheroFolderName = path.join(__dirname).split(path.sep)
	bacheroFolderName = bacheroFolderName[bacheroFolderName.length - 1]

	// Si on doit afficher dans la console, on le fait
	if(showDebugLogsInConsole) console.debug(`${new Date().toLocaleTimeString()} ${chalk ? chalk.magenta("[DEBUG]") : "[DEBUG]"}  ${chalk ? chalk.gray(`(${callerModule == `${bacheroFolderName}/index.js` ? "Module Loader" : callerModule == `${bacheroFolderName}/functions.js` ? "Bachero Functions" : callerModule})`) : `(${callerModule == `${bacheroFolderName}/index.js` ? "Module Loader" : callerModule == `${bacheroFolderName}/functions.js` ? "Bachero Functions" : callerModule})`}`, ...args)

	// L'ajouter également aux fichiers de logs machines récentes (et le supprimer s'il existe déjà et qu'on affiche la première log)
	if(!fs.existsSync(path.join(__dirname, "logs"))) fs.mkdirSync(path.join(__dirname, "logs"))
	if(!showedLog_debug && !showedLog && fs.existsSync(path.join(__dirname, "logs", "machine-latest.txt"))) fs.unlinkSync(path.join(__dirname, "logs", "machine-latest.txt"))
	fs.appendFileSync(path.join(__dirname, "logs", "machine-latest.txt"), `DEBUG▮${Date.now()}▮[DEBUG]▮${callerModule == `${bacheroFolderName}/index.js` ? "Module Loader" : callerModule == `${bacheroFolderName}/functions.js` ? "Bachero Functions" : callerModule.replaceAll("▮", "").replaceAll("%JUMP%", "% JUMP%").replaceAll("\n", "%JUMP%")}▮${args.map(x => typeof x == "object" ? stringify(x) : x).join(" ")}\n`)

	// Retourner true
	if(!showedLog_debug) showedLog_debug = true
	return true
}

// Fonction pour définir un cooldown à un utilisateur
/**
	Défini un cooldown à un utilisateur. Pour éviter un utilisateur d'effectuer de nombreuses fois une action par exemple.

	```js
	// Empêcher l'utilisateur avec l'identifiant "interaction.user.id" d'effectuer une action pendant les 5 prochaines secondes (5000 ms)
	if(await bacheroFunctions.cooldown.check('helloworldUsage', interaction.user.id)) return interaction.reply('bonsoir non')
	else await bacheroFunctions.cooldown.set('helloworldUsage', interaction.user.id, 1000)
	```

	@param {string} cooldownId Identifiant du cooldown, doit être unique
	@param {string} userId Identifiant de l'utilisateur à limiter
	@param {number} cooldownTime Durée du cooldown en millisecondes
	@returns {number} Durée du cooldown
*/
async function setCooldown(cooldownId, userId, cooldownTime){
	// Si la durée est supérieure à 100000 (100 secondes)
	// Utiliser la base de données pour le cooldown (reste présent après un redémarrage du bot)
	if(cooldownTime > 100000){
		// Si cooldownDb n'existe pas, le créé
		if(!cooldownDb) cooldownDb = await getDatabase("persistantCooldown")

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
/**
	Vérifie si un utilisateur ne fais pas partie de la liste d'utilisateurs limités par un cooldown.

	```js
	// Vérifier uniquement si l'utilisateur avec l'identifiant "interaction.user.id" peut effectuer une action
	if(await bacheroFunctions.cooldown.check('helloworldUsage', interaction.user.id)) return interaction.reply('bonsoir non')
	```

	@param {string} cooldownId Identifiant du cooldown, doit être unique
	@param {string} userId Identifiant de l'utilisateur à vérifier
	@returns {number} Durée du cooldown restante, ou 0 si l'utilisateur n'est pas limité
*/
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
		if(!cooldownDb) cooldownDb = await getDatabase("persistantCooldown")

		// Obtenir le cooldown
		var cooldown = await database_get(cooldownDb, `${cooldownId}-${userId}`)
	}

	// Si le cooldown n'existe pas
	if(cooldown instanceof Error) return 0
	if(!cooldown) return 0

	// Sinon, vérifier s'il est expiré
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
/**
	Supprime le cooldown d'un utilisateur, en supprimant la limite et le laissant effectuer des actions à nouveau.

	```js
	bacheroFunctions.cooldown.delete('helloworldUsage', interaction.user.id, true)
	```

	@param {string} cooldownId Identifiant du cooldown, doit être unique
	@param {string} userId Identifiant de l'utilisateur à "rendre libre"
	@param {boolean} waitForDelete Si la fonction doit attendre la suppression dans la base de données
	@returns {boolean} true
*/
async function deleteCooldown(cooldownId, userId, waitForDelete = true){
	// S'il est dans la map, le supprimer
	if(cooldowns.has(`${cooldownId}-${userId}`)){
		cooldowns.delete(`${cooldownId}-${userId}`)
	}
	// Sinon, vérifier dans la base de données
	else {
		if(!cooldownDb) cooldownDb = await getDatabase("persistantCooldown")
		if(waitForDelete) await database_delete(cooldownDb, `${cooldownId}-${userId}`)
		else database_delete(cooldownDb, `${cooldownId}-${userId}`)
	}

	// Retourner true
	return true
}

// Fonction pour répondre à une interaction si la personne est limité par le cooldown
/**
	Vérifie si un utilisateur est limité, et répondre à l'interaction si c'est le cas.

	```js
	// Vérifier et répondre si l'utilisateur est limité, sinon on le limite
	var checkAndReply = await bacheroFunctions.cooldown.checkAndReply(interaction, 'helloworldUsage')
	if(checkAndReply) return; else await bacheroFunctions.cooldown.set('helloworldUsage', interaction.user.id, 1000)
	```

	@param {object} interaction Interaction DiscordJS à vérifier
	@param {string} cooldownId Identifiant du cooldown, doit être unique
	@returns {boolean} Si l'utilisateur est limité
*/
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
		color: parseInt(config_getValue("bachero", "secondEmbedColor").replace("#", ""), 16)
	}], ephemeral: true, components: [], content: null })

	// Retourner true
	return true
}

// Fonction pour obtenir un rapport d'erreur
/**
	Retourne un rapport d'erreur par son identifiant, ou `false` si le système est désactivé.

	```js
	console.log(await bacheroFunctions.report.get('0dR2aEuesjTc2c'))
	```

	@param {string} id Identifiant du rapport d'erreur
	@returns {string} Contenu du rapport d'erreur
*/
async function report_get(id){
	// Si le système est désactivé
	if(config_getValue("bachero", "disableReport") == true) return "Le système de rapport d'erreur est désactivé."

	// Obtenir le rapport depuis la BDD
	var report
	try {
		if(config_getValue("bachero", "databaseType") == "mongodb"){
			var db = getDatabase("internalBachero.reports")
			var report = await database_get(db, id)
		} else {
			if(!fs.existsSync(path.join(__dirname, "reports"))) fs.mkdirSync(path.join(__dirname, "reports"))
			var report = fs.readFileSync(path.join(__dirname, "reports", `${id}.txt`)).toString()
		}
	} catch (err) {
		return "Ce rapport n'existe pas."
	}

	// Retourner l'identifiant du rapport
	return report
}

// Fonction pour créé un rapport d'erreur
/**
	Crée un rapport d'erreur et retourne l'identifiant de celui-ci, ou `false` si le système est désactivé.

	```js
	try {
		var fetchedContent = await fetch('http://localhost').then(res => res.json())
	} catch (error) {
		var reportId = await bacheroFunctions.report.create('error', error, { url: 'http://localhost' }, interaction)
		interaction.reply(`Une erreur est survenue, le rapport d'erreur a été créé avec l'identifiant \`${reportId}\`.`)
	}
	```

	@param {string} context Contexte rencontré lors de l'erreur
	@param {object} error Erreur qui sera enregistrée dans le rapport
	@param {object} moreInfos Objet qui contiendra des informations en plus
	@param {object} interaction Interaction DiscordJS
	@returns {string} Identifiant du rapport d'erreur
*/
async function report_create(context, error, moreInfos, interaction){
	// Si le système est désactivé
	if(config_getValue("bachero", "disableReport") == true) return false

	// Préparer les informations facultatives
	if(!error) var error = "Impossible d'obtenir des détails sur l'erreur."
	if(!context) var context = "contexte inconnu"
	if(!moreInfos) var moreInfos = {}

	// Si les infos supplémentaires sont un string
	if(typeof moreInfos == "string") moreInfos = { "fromstring": moreInfos }

	// Informations facultatives sur l'interaction
	if(!interaction) interaction = {}
	if(interaction) interaction = {
		authorId: interaction?.user?.id || interaction?.author?.id,
		guildId: interaction?.guild?.id,
		channelId: interaction?.channel?.id,
		customId: interaction?.customId,
		sourceType: `${interaction?.sourceType} (type: ${interaction?.type})`,
		commandName: interaction?.commandName,
		subCommandName: interaction?.subCommandName,
		args: interaction?.args,
		deferred: interaction?.deferred,
		replied: interaction?.replied,
		ephemeral: interaction?.ephemeral,
		type: interaction?.type
	}

	// Version du bot
	var version = require("./package.json").version || "Inconnue"

	// Préparer les informations de base
	var randomid = nanoid()
	var date = new Date().toLocaleString()

	// Obtenir le chemin du fichier qui a appelé la fonction
	var callerPath = new Error().stack.split("\n")?.map(line => line.trim()).filter(line => line.startsWith("at "))

	// Obtenir les logs récentes (il y a moins de 5sec)
	var logs = fs.readFileSync(path.join(__dirname, "logs", "machine-latest.txt")).toString().split("\n").filter(x => x).map(x => {
		var log = x.split("▮")
		return {
			type: log[0],
			date: log[1],
			level: log[2],
			invoker: log[3],
			details: log[4]
		}
	}).filter(x => x.date > Date.now() - 5000)

	// Créer le rapport sous forme de texte
	var report = `${randomid} | Rapport (contexte: ${context}) générée le ${date} avec Bachero v${version}.\n\n${"=".repeat(15)} À partir de l'interaction\n${Object.entries(interaction).map(x => `\n• ${x[0]}: ${typeof x[1] == "object" ? stringify(x[1]) : x[1]}`).join("")}\n\n${"=".repeat(15)} Source de l'exécution\n${callerPath?.map(x => `\n• ${x}`)}\n\n${"=".repeat(15)} Informations apportées par le module\n\n${stringify(moreInfos) || moreInfos}\n\n${"=".repeat(15)} Logs récentes\n\n${logs.length ? logs.map(log => `${global.intlFormatter.format(new Date(parseInt(log?.date) || 0)).split(" ")?.[1]} ${log?.level} (${log?.invoker}) ${log?.details}`).join("\n") : "Aucune log n'a pu être trouvé"}\n\n${"=".repeat(15)} Contenu de l'erreur\n\n${error.stack || error.message || error.toString() || error}`

	// L'enregistrer dans la BDD
	if(config_getValue("bachero", "databaseType") == "mongodb"){
		var db = getDatabase("internalBachero.reports")
		await database_set(db, randomid, report)
	} else {
		if(!fs.existsSync(path.join(__dirname, "reports"))) fs.mkdirSync(path.join(__dirname, "reports"))
		fs.writeFileSync(path.join(__dirname, "reports", `${randomid}.txt`), report)
	}

	// Retourner l'identifiant du rapport
	return randomid
}

// Fonction pour créé un rapport d'erreur et le rapporter
/**
	Crée un rapport d'erreur et réponds à l'interaction avec l'identifiant du rapport et le contenu raccourci de l'erreur.
	Si le système est désactivé, la fonction répondra quand même à l'interaction, mais sans l'identifiant du rapport.

	```js
	try {
		var fetchedContent = await fetch('http://localhost').then(res => res.json())
	} catch (error) {
		await bacheroFunctions.report.createAndReply('error', error, { url: 'http://localhost' }, interaction)
	}
	```

	@param {string} context Contexte rencontré lors de l'erreur
	@param {object} error Erreur qui sera enregistrée dans le rapport
	@param {object} moreInfos Objet qui contiendra des informations en plus
	@param {object} interaction Interaction DiscordJS
*/
async function report_createAndReply(context, error, moreInfos, interaction){
	// Décider si on doit répondre ou modifier
	if(!interaction.replied && !interaction.deferred) interaction.action = interaction.reply
	else interaction.action = interaction.editReply

	// Si le système est désactivé
	if(config_getValue("bachero", "disableReport") == true) return interaction.action({ components: [], content: null, embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription(`Un problème est survenu lors de l'exécution de la commande (contexte : ${context}) :\n\`\`\`\n${error?.toString()?.replace(/`/g, " `") || error}\n\`\`\``).setColor(config_getValue("bachero", "dangerEmbedColor")).setFooter({ text: `N'hésitez pas à signaler ce problème au staff de ${botName} !` })], ephemeral: true }).catch(err => {})

	// Créer le rapport
	var reportId = await report_create(context, error, moreInfos, interaction)

	// Répondre
	return interaction.action({ components: [], content: null, embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription(`Un problème est survenu lors de l'exécution de la commande (contex : ${context}) :\n\`\`\`\n${error?.toString()?.replace(/`/g, " `") || error}\n\`\`\`\nEn cas de besoin, vous pourrez communiquer l'identifiant \`${reportId}\` au support pour les aider dans la résolution de problème.`).setColor(config_getValue("bachero", "dangerEmbedColor"))], ephemeral: true }).catch(err => {
		showLog("warn", `Impossible de répondre à une interaction (contexte: ${context}) : ${err}`, "error-report-send-failed")
	})
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
	colors: {
		primary: config_getValue("bachero", "embedColor"),
		secondary: config_getValue("bachero", "secondEmbedColor"),
		success: config_getValue("bachero", "successEmbedColor"),
		danger: config_getValue("bachero", "dangerEmbedColor"),
		rouge: "#ed4245",
		vert: "#12c700",
		bleu: "#01579b",
		orange: "#ff6f00",
		blanc: "#fafafa",
		noir: "#212121",
		jaune: "#ffff00",
		violet: "#512da8",
		cyan: "#4fc3f7",
		rose: "#ffafcc",
		gris: "#f5f5f5",
		grisfonce: "#524b50",
		marron: "#604840",
		saumon: "#f9906f"
	},
	showLog: showLog,
	showDebug: showDebug,
	parseUserFromString: parseUserFromString,
	foldersPath: foldersPath,
	package: require("./package.json"),
	ownerIds: ownerIds
}