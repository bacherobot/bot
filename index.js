// Commencer à mesurer le temps que le bot a pris pour s'allumer
var performanceStart = performance.now()

// Importer quelques librairies
const fs = require("fs")
const path = require("path")
const jsonc = require("jsonc")
const Fuse = require("fuse.js")
const StackTracey = require("stacktracey")
const { EventEmitter } = require("events")
const bacheroFunctions = require("./functions"); global.bacheroFunctions = bacheroFunctions // En profiter pour la partager aux modules

// Obtenir quelques variables en plus
var optimized = process.argv.includes("--optimize")
var hideUnimportantLogs = process.argv.includes("--hide-unimportant-logs")
var botPrefix = bacheroFunctions.config.getValue("bachero", "prefix")

// Importer des modules et définir des variables en fonction du mode optimisé
var chalk
var UglifyJS
var statsDatabase
var databaseTextCommandDisabledGuilds
var botName
var disableTextCommand
var elbotStyleInErrors // easter egg :> p'tite ref pour le module elbot
if(optimized){
	chalk = { red: (text) => text, yellow: (text) => text, green: (text) => text, blue: (text) => text, bold: (text) => text, gray: (text) => text }
	botName = "Bachero"
	disableTextCommand = true
	elbotStyleInErrors = false
} else {
	chalk = require("chalk")
	if(!bacheroFunctions.config.getValue("bachero", "disableMinifyingTextCmdsFiles")) UglifyJS = require("uglify-js")
	botName = bacheroFunctions.config.getValue("bachero", "botName")
	statsDatabase = bacheroFunctions.database.getDatabase("internalBachero.stats")
	databaseTextCommandDisabledGuilds = bacheroFunctions.database.getDatabase("textCommandDisabledGuilds")
	disableTextCommand = bacheroFunctions.config.getValue("bachero", "disableTextCommand")
	elbotStyleInErrors = bacheroFunctions.config.getValue("bachero", "elbotStyleInErrors")
}

// On gère les erreurs non gérées
function showException(err){
	// Sinon, on affiche une stack trace plus propre
	const oldStack = new StackTracey(err)
	const newStack = []

	// Si l'erreur est un string, on l'affiche normalement
	if(typeof e == "string") return console.error(err)

	// On masque/modifie certaines lignes
	var isBecauseOfBacheroModule = false
	for(const line of oldStack.items){
		// Masquer des trucs internes
		if(line.file.includes("/cjs")) continue
		if(line.callee == "Script.runInContext") continue

		// Obtenir la position de la ligne
		var linePosition = oldStack.items.indexOf(line)
		if(linePosition == 0 && line?.fileRelative?.length && !line?.fileRelative?.startsWith("node_modules") && line?.fileRelative?.match("modules\/.*\/*..(js|ts)")?.length) isBecauseOfBacheroModule = line.fileRelative?.match("modules\/.*\/*..(js|ts)")?.[0] || true  // eslint-disable-line

		// Ajouter la ligne à la nouvelle stack
		newStack.push(line)
	}

	// Afficher la nouvelle stack
	bacheroFunctions.showLog("error", `${chalk.red(`${err.name}:`)} ${chalk.red(err.message)}`, "bachero-exception", true, true)
	var newError = new StackTracey(newStack)
	bacheroFunctions.showLog("error", newError.items.map((line, i) => {
		var content = `    at ${line.callee ? `${line.callee} (` : ""}${line.file ? line.file : ""}${typeof line.line == "number" ? `:${line.line}` : ""}${typeof line.column == "number" ? `:${line.column}` : ""}${line.callee ? ")" : ""}`
		return i == 0 ? chalk.bold(content) : content
	}).join("\n"), "bachero-exception", true, true)
	bacheroFunctions.showLog("error", `\n${isBecauseOfBacheroModule ? `Module Bachero : ${chalk.yellow(isBecauseOfBacheroModule)} ; ` : ""}NodeJS : ${chalk.blue(process.version.replace("v", ""))} ; Bachero : ${chalk.blue(require("./package.json")?.version || "Inconnu")} ; DiscordJS : ${chalk.blue(require("discord.js")?.version || "Inconnu")}`, "bachero-exception", true, true)
	bacheroFunctions.showLog("error", chalk.gray(`(${new Date().toLocaleDateString()} ; ${new Date().toLocaleTimeString()})`), "bachero-exception", true, true)
}
process.on("uncaughtException", err => showException(err))
process.on("unhandledRejection", err => showException(err))

// Créé quelques listeners
var interactionListener = new EventEmitter()
var interactionListenerText = new EventEmitter()

// Vérifier les cooldown persistants dans la base de données
async function checkPersistentCooldowns(){
	var allCooldown = await bacheroFunctions.database.getAll(bacheroFunctions.database.getDatabase("persistantCooldown"))
	for(var cooldown of Object.values(allCooldown)){
		// Si le cooldown est expiré, le supprimer
		if(cooldown.expireDate < Date.now()) await bacheroFunctions.database.delete(bacheroFunctions.database.getDatabase("persistantCooldown"), `${cooldown.cooldownId}-${cooldown.userId}`)
	}
} checkPersistentCooldowns()

// Fonction pour vérifier si un module existe
function moduleExists(moduleName){
	try {
		require.resolve(moduleName)
		return true
	} catch (err){
		return false
	}
}

// Imports en rapport avec Discord
const { REST } = require("@discordjs/rest")
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN)
const { Client, GatewayIntentBits, PermissionsBitField, Partials, EmbedBuilder, Routes, ActivityType } = require("discord.js")

// Obtenir les détails du statut
var botActivityContent = bacheroFunctions.config.getValue("bachero", "botActivityContent")
var botActivityType = bacheroFunctions.config.getValue("bachero", "botActivityType")
botActivityType = { "playing": ActivityType.Playing, "streaming": ActivityType.Streaming, "watching": ActivityType.Watching, "listening": ActivityType.Listening, "competing": ActivityType.Competing, "custom": ActivityType.Custom }[botActivityType?.toLowerCase() || "playing"]

// Créer le client
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent
	],
	partials: [
		Partials.User,
		Partials.Channel,
		Partials.GuildMember,
		Partials.Message,
		Partials.Reaction,
		Partials.GuildScheduledEvent,
		Partials.ThreadMember
	],
	presence: {
		status: (bacheroFunctions.config.getValue("bachero", "botStatus") || "online"),
		activities: [{ name: botActivityContent, type: botActivityType }]
	}
})

// Quelques maps pour le client
client.commands = new Map()
client.contextsMenus = new Map()
client.allModulesDetails = new Map()
client.textCommands = new Map()
client.isAllModulesLoaded = false

// Obtenir la liste des modules et préparer une variable
var modulesFolder = process.argv.find(arg => arg.startsWith("--load-modules="))?.split("=")?.[1]?.split(",") || fs.readdirSync(path.join(__dirname, "modules"))
var allModules = []
var allSlashCommands = []
var allGetClientsFunctions = []

// Charger et vérifier tout les modules
function loadModules(){
	// Dans la liste des modules, on enlève les dossiers générés par l'OS
	modulesFolder = modulesFolder.filter(module => ![".DS_Store", "Thumbs.db", "desktop.ini", "System Volume Information"].includes(module))

	// On vérifie et charge les modules
	for(var module of modulesFolder){
		// Lire le fichier manifest.jsonc
		var manifest
		try {
			manifest = jsonc.parse(fs.readFileSync(path.join(__dirname, "modules", module, "manifest.jsonc"), "utf8"))
		} catch (err){
			manifest = null
		}

		// Préparer la liste des erreurs du module
		var errors = []

		// Si le fichier manifeste n'existe même pas
		if(!manifest) errors.push(`${chalk.red("[ERROR] ")}Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc n'existe pas ou est invalide.`)

		// Si le fichier est désactivé, passer au prochain
		if(manifest?.disabled){
			if(!hideUnimportantLogs) bacheroFunctions.showLog("warn", `Module ${chalk.yellow(manifest.packageName)} désactivé`, "module-load-disabled")
			continue
		}

		// Si on est en mode optimisé, ne pas vérifier les valeurs du manifeste
		if(!optimized){
			// Vérifier qu'il contient les valeurs nécessaires
			if(!manifest?.packageName) errors.push(`Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow("packageName")}.`)
			if(!manifest?.name) errors.push(`Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow("name")}.`)
			if(!manifest?.shortDescription) errors.push(`Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow("shortDescription")}.`)
			if(!manifest?.authors) errors.push(`Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow("authors")}.`)
			if(!manifest?.files) errors.push(`Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow("files")}.`)

			// Vérifier que les valeurs nécessaires sont de bon type
			if(typeof manifest?.packageName != "string") errors.push(`Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow("packageName")} n'est pas de type ${chalk.yellow("string")}.`)
			if(typeof manifest?.name != "string") errors.push(`Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow("name")} n'est pas de type ${chalk.yellow("string")}.`)
			if(typeof manifest?.shortDescription != "string") errors.push(`Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow("shortDescription")} n'est pas de type ${chalk.yellow("string")}.`)
			if(typeof manifest?.authors != "object") errors.push(`Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow("authors")} n'est pas de type ${chalk.yellow("array")}.`)
			if(typeof manifest?.files != "object") errors.push(`Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow("files")} n'est pas de type ${chalk.yellow("array")}.`)

			// Si un module avec le même nom de packet existe déjà
			if(allModules.find(moduleA => moduleA.packageName == manifest.packageName)) errors.push(`Impossible de charger le module ${chalk.yellow(module)} : un module avec le même nom de packet existe déjà.`)
			if(allModules.find(moduleA => moduleA.packageName == module)) errors.push(`Impossible de charger le module ${chalk.yellow(module)} : un module avec le même nom de packet existe déjà.`)

			// Vérifier que les librairies nécessaires existent
			if(manifest?.dependencies) for(var dependencie of manifest.dependencies){
				if(dependencie?.length && typeof dependencie == "string") var name = dependencie.startsWith("@") ? `@${dependencie?.split("@")?.[1]}` : dependencie?.split("@")?.[0]
				if(!moduleExists(name)) errors.push(`Impossible de charger le module ${chalk.yellow(module)} : la librairie ${chalk.yellow(name)} n'est pas installée (${chalk.yellow(`npm i ${dependencie}`)}).`)
			}

			// Vérifier que les fichiers existent
			for(var file of manifest?.files || []){
				if(!fs.existsSync(path.join(__dirname, "modules", module, file))) errors.push(`Impossible de charger le module ${chalk.yellow(module)} : le fichier ${chalk.yellow(file)} n'existe pas.`)
			}
		}

		// Si il y a des erreurs
		if(errors.length > 0){
			bacheroFunctions.showLog("error", `Des erreurs ont été rencontrées :\n${errors.map(err => `  ${err}`).join("\n")}`, "module-load-error")
			return process.exit()
		}

		// Si le module a besoin d'un fichier de configuration
		if(manifest?.config && manifest?.config?.length){
			// Construire un objet qui contiendra les valeurs de configuration
			var config = { "config": [] }
			for(var conf of manifest.config){
				config.config.push({
					name: conf.name,
					type: conf.type,
					default: conf.default,
					value: conf.default,
					description: conf.description,
				})
			}

			// Si le fichier n'existe pas, le créer
			if(!fs.existsSync(path.join(__dirname, "config", `${module}.jsonc`))){
				fs.writeFileSync(path.join(__dirname, "config", `${module}.jsonc`), JSON.stringify(config, null, 4))
				if(!hideUnimportantLogs) bacheroFunctions.showLog("info", `Un fichier de configuration a été créé pour le module ${chalk.yellow(module)}.`, "module-load-config-created")
			}

			// Si le fichier existe déjà, on vérifie qu'il contient bien les valeurs nécessaires
			else {
				var configFile = jsonc.parse(fs.readFileSync(path.join(__dirname, "config", `${module}.jsonc`), "utf8"))
				for(var conf of config.config){
					if(!configFile.config.find(c2 => c2.name == conf.name)){
						configFile.config.push({
							name: conf.name,
							type: conf.type,
							default: conf.default,
							value: conf.default,
							description: conf.description,
						})
						if(!hideUnimportantLogs) bacheroFunctions.showLog("info", `Le fichier de configuration du module ${chalk.yellow(module)} a été mis à jour.`, "module-load-config-updated")
					}
				}
				fs.writeFileSync(path.join(__dirname, "config", `${module}.jsonc`), JSON.stringify(configFile, null, 4))
			}
		}

		// Ajouter le module à la liste des modules
		allModules.push(manifest)

		// Ajouter les commandes slash et menus contextuel
		var thisModuleAllCommands = []
		var thisModuleAllContextsMenu = []
		for(var fileName of manifest.files){
			// Obtenir le fichier
			var file = require(path.join(__dirname, "modules", module, fileName))

			// Modifier le fichier pour la compatibilité des text commands
			if(disableTextCommand != true) var editedfile = require(textCommandCompatibility(path.join(__dirname, "modules", module, fileName)))

			// En profiter pour donner au module le listener
			if(file?.interactionListener) file.interactionListener(interactionListener)
			if(editedfile?.interactionListenerText) editedfile.interactionListenerText(interactionListenerText)

			// Si il y a des commandes slash
			if(file?.slashInfo && file?.execute){
				if(allSlashCommands.find(slashCommand => slashCommand.name == file.slashInfo.name)){
					bacheroFunctions.showLog("error", `Impossible de charger le module ${chalk.yellow(module)} : une commande slash avec le même nom existe déjà.`, "module-load-error")
					return process.exit()
				}
				var slashInfoJSON = file.slashInfo.toJSON()
				slashInfoJSON.slashToText = file.slashToText
				if(disableTextCommand != true) client.textCommands.set(editedfile.slashInfo.toJSON().name, { file: editedfile, whitelistedGuildIds: manifest.whitelistedGuildIds })
				client.commands.set(slashInfoJSON.name, { file: file, whitelistedGuildIds: manifest.whitelistedGuildIds })
				allSlashCommands.push(slashInfoJSON)
				thisModuleAllCommands.push(slashInfoJSON)
			}

			// Si il y a des menus contextuel
			if(file?.contextInfo && file?.execute){
				if(thisModuleAllContextsMenu.find(slashCommand => slashCommand.name == file.contextInfo.name)){
					bacheroFunctions.showLog("error", `Impossible de charger le module ${chalk.yellow(module)} : un menu contextuel avec le même nom existe déjà.`, "module-load-error")
					return process.exit()
				}
				client.contextsMenus.set(file.contextInfo.toJSON().name, { file: file, whitelistedGuildIds: manifest.whitelistedGuildIds })
				allSlashCommands.push(file.contextInfo.toJSON()) // oui je met ça dans la variable des cmd slash, ça marche donc go
				thisModuleAllContextsMenu.push(file.contextInfo.toJSON())
			}

			// Si il y a une fonction pour obtenir le client
			if(file?.getClient) allGetClientsFunctions.push(file.getClient)
		}

		// Ajouter les informations détaillées du module
		client.allModulesDetails.set(module, {
			name: manifest.name,
			packageName: module,
			shortDescription: manifest.shortDescription,
			authors: manifest.authors.map(author => author.name || author.discordId || author || "Inconnu"),
			completeAuthors: manifest.authors,
			commands: thisModuleAllCommands,
			contextsMenus: thisModuleAllContextsMenu,
			source: manifest.source,
			whitelistedGuildIds: manifest.whitelistedGuildIds,
			file: file
		})

		// Afficher le message une fois démarré
		if(!hideUnimportantLogs) bacheroFunctions.showLog("ok", `Module ${chalk.yellow(manifest.packageName)} chargé${manifest?.onloadMessage ? ` (${manifest?.onloadMessage})` : ""}.`, "module-load-succeed")
	}

	// Tout les modules sont chargés
	client.isAllModulesLoaded = true
} loadModules()

// Connecter le bot à Discord
client.login(process.env.DISCORD_TOKEN)

// Pouvoir rechercher une commande
var searchSlashCommands = new Fuse(allSlashCommands.filter(slash => !slash.type).map(slash => slash.name), {
	includeScore: true,
	shouldSort: true,
	distance: 200,
	threshold: 0.6
})

// Crée les commandes
async function createCommands(){
	try {
		if(!hideUnimportantLogs) bacheroFunctions.showLog("info", "Actualisation des commandes slashs commencées...", "slash-reload-begin")
		await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: allSlashCommands })
		bacheroFunctions.showLog("info", "Actualisation des commandes slashs terminées.", "slash-reload-succeed")
	} catch (error){
		bacheroFunctions.showLog("warn", "Impossible d'actualiser les commandes slashs.", "slash-reload-error")
		bacheroFunctions.showLog("warn", error.stack || error, "slash-reload-error", true, true)
	}

	// Une fois que tout ça est fait, on vérifie les mises à jour
	if(!optimized) checkUpdates()
}

// Vérifier les mises à jour
async function checkUpdates(){
	// Si la vérification est désactivé
	if(bacheroFunctions.config.getValue("bachero", "disableCheckUpdate") == true) return

	// Obtenir la date de dernière vérification
	var lastUpdateCheck = await bacheroFunctions.database.get(statsDatabase, "lastUpdateCheck")

	// Ne vérifier à nouveau que si la date de dernière vérification est supérieur à 24h
	if(!lastUpdateCheck || (lastUpdateCheck && lastUpdateCheck < Date.now() - (1000 * 60 * 60 * 24))){
		// Mettre à jour la date de dernière vérification
		await bacheroFunctions.database.set(statsDatabase, "lastUpdateCheck", Date.now())

		// Obtenir les mises à jour
		var latestPackageJson = await require("node-fetch")("https://raw.githubusercontent.com/bacherobot/bot/master/package.json").then(res => res.text())

		// Tenter de parse en JSON
		try {
			latestPackageJson = JSON.parse(latestPackageJson)
		} catch (err){
			bacheroFunctions.showLog("warn", "Vérifications des mises à jours annulées, impossible d'obtenir le package.json de la dernière version (rate limit ? down ?) :", "maj-check-error")
			bacheroFunctions.showLog("warn", err.stack || err, "maj-check-error", true, true)
			latestPackageJson = {}
		}

		// Enregistrer la dernière version dans la BDD
		await bacheroFunctions.database.set(statsDatabase, "lastUpdateVersion", latestPackageJson.version)
	}

	// Vérifier la version
	var actualVersion = require(path.join(__dirname, "package.json")).version
	var latestVersion = latestPackageJson ? latestPackageJson?.version : await bacheroFunctions.database.get(statsDatabase, "lastUpdateVersion")
	if(latestVersion != actualVersion){
		bacheroFunctions.showLog("info", `Une mise à jour de Bachero est disponible, ${chalk.yellow(actualVersion)} → ${chalk.yellow(latestVersion)}, https://github.com/bacherobot/bot/releases/tag/${latestVersion}`, "maj-available")
	}
}

// Fonction pour créer un embed d'erreur / avertissement
function createErrorEmbed(title, description, embedColor = "secondEmbedColor", showErrorFooter = false){
	if(elbotStyleInErrors) title = title.replace("Une erreur est survenue", "Erreur de la console")
	var embed = new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setColor(bacheroFunctions.config.getValue("bachero", embedColor))
	if(showErrorFooter) embed.setFooter({ text: typeof showErrorFooter == "string" ? showErrorFooter : `N'hésitez pas à signaler ce problème au staff de ${botName} !` })
	if(elbotStyleInErrors && embedColor == "dangerEmbedColor") embed.setThumbnail("https://cdn.discordapp.com/attachments/1092512692499120280/1136754644287225908/Sans_titre_1.png")
	else if(elbotStyleInErrors) embed.setThumbnail("https://cdn.discordapp.com/attachments/1092512692499120280/1092532047182053407/elbot.jpg")
	return embed
}

// Quand on reçoit une interaction
client.on("interactionCreate", async interaction => {
	// Si c'est un menu contextuel
	// Note: doit rester au dessus de la vérification de commande slash, puisque les interactions comme celle-ci retourne true à la fonction isCommand()
	if(interaction.isUserContextMenuCommand()){
		// Récupérer le menu par son nom
		var contextMenu = client.contextsMenus.get(interaction.commandName)

		// Si aucune résultat
		if(!contextMenu) return await interaction.reply({ embeds: [createErrorEmbed("Menu contextuel inexistant", `Ce menu contextuel est introuvable dans ${botName}.`, "dangerEmbedColor", true)], ephemeral: false })

		// Vérifier qu'on est sur un serveur autorisé
		if(contextMenu?.whitelistedGuildIds?.length && !contextMenu.whitelistedGuildIds.includes(interaction.guildId)){
			return await interaction.reply({ embeds: [createErrorEmbed("Serveur interdit", "Ce menu contextuel ne peut pas être exécuté puisque ce serveur n'est pas autorisé.")], ephemeral: true })
		}

		// Exécuter la commande
		try {
			interaction.sourceType = "contextMenu"
			await contextMenu.file.execute(interaction)
		} catch (error){
			bacheroFunctions.showLog("warn", `${interaction.user.discriminator == "0" ? interaction.user.username : interaction.user.tag} a exécuté le menu contextuel ${chalk.yellow(interaction.commandName)} qui a fini en une erreur :`, "user-contextmenu-error")
			bacheroFunctions.showLog("warn", error.stack || error, "user-contextmenu-error", true, true)
			try {
				interaction.reply({ embeds: [createErrorEmbed("Une erreur est survenue", `Un problème est survenu lors de l'exécution du menu contextuel :\n\`\`\`\n${error?.toString()?.replace(/`/g, " `") || error}\n\`\`\``, "dangerEmbedColor", true)], ephemeral: false }).catch(err => {})
			} catch (error){
				await interaction.editReply({ embeds: [createErrorEmbed("Une erreur est survenue", `Un problème est survenu lors de l'exécution du menu contextuel :\n\`\`\`\n${error?.toString()?.replace(/`/g, " `") || error}\n\`\`\``, "dangerEmbedColor", true)], ephemeral: false }).catch(err => {})
			}
		}
	}

	// Si c'est une commande slash
	else if(interaction.isCommand()){
		// Récupérer la commande par son nom
		var command = client.commands.get(interaction.commandName)

		// Si aucune commande trouvé
		if(!command) return await interaction.reply({ embeds: [createErrorEmbed("Commande inexistante", `Cette commande est introuvable dans ${botName}.`, "dangerEmbedColor", true)], ephemeral: false })

		// Vérifier qu'on est sur un serveur autorisé
		if(command?.whitelistedGuildIds?.length && !command.whitelistedGuildIds.includes(interaction.guildId)){
			return await interaction.reply({ embeds: [createErrorEmbed("Serveur interdit", "Cette commande ne peut pas être exécuté puisque ce serveur n'est pas autorisé.")], ephemeral: true })
		}

		// Exécuter la commande
		try {
			interaction.sourceType = "slashCommand"
			await command.file.execute(interaction)
		} catch (error){
			bacheroFunctions.showLog("warn", `${interaction.user.discriminator == "0" ? interaction.user.username : interaction.user.tag} a exécuté la commande slash ${chalk.yellow(interaction.commandName)} qui a fini en une erreur :`, "user-slashcommand-error")
			bacheroFunctions.showLog("warn", error.stack || error, "user-slashcommand-error", true, true)
			try {
				interaction.reply({ embeds: [createErrorEmbed("Une erreur est survenue", `Un problème est survenu lors de l'exécution de la commande :\n\`\`\`\n${error?.toString()?.replace(/`/g, " `") || error}\n\`\`\``, "dangerEmbedColor", true)], ephemeral: false }).catch(err => {})
			} catch (error){
				await interaction.editReply({ embeds: [createErrorEmbed("Une erreur est survenue", `Un problème est survenu lors de l'exécution de la commande :\n\`\`\`\n${error?.toString()?.replace(/`/g, " `") || error}\n\`\`\``, "dangerEmbedColor", true)], ephemeral: false }).catch(err => {})
			}
		}
	}

	// Dans certains cas, on l'envoie au listener
	else if(interaction.isModalSubmit()){
		if(interaction?.message?.type == 20 || interaction?.message?.type == 23) return interactionListener.emit("modal", interaction) // "CHAT_INPUT_COMMAND" / "CONTEXT_MENU_COMMAND"
		// else if(interaction?.message?.type) return interactionListenerText.emit('modal', interaction)
		else interactionListener.emit("modal", interaction)
	}
	else if(interaction.isButton()){
		if(interaction?.message?.type == 20 || interaction?.message?.type == 23) return interactionListener.emit("button", interaction) // "CHAT_INPUT_COMMAND" / "CONTEXT_MENU_COMMAND"
		// else if(interaction?.message?.type) return interactionListenerText.emit('button', interaction)
		else return interactionListener.emit("button", interaction)
	}
	else if(interaction.isAnySelectMenu()){
		if(interaction?.message?.type == 20 || interaction?.message?.type == 23) return interactionListener.emit("selectMenu", interaction) // "CHAT_INPUT_COMMAND" / "CONTEXT_MENU_COMMAND"
		// else if(interaction?.message?.type) return interactionListenerText.emit('selectMenu', interaction)
		else return interactionListener.emit("selectMenu", interaction)
	}
})

// Quand le bot reçoit un message
client.on("messageCreate", async message => {
	// Répondre à ElWatch
	if(message.content === "Hello from ElWatch!" && message.author.id === "898255769827430460") return message.reply(":eye:")

	// Si on a désactivé les commandes par message, ignorer la suite du code
	if(disableTextCommand) return

	// Uniquement si c'est le bon prefix
	if(!message.content.startsWith(botPrefix)) return

	// Empêcher les bots
	if(message.author.bot && !bacheroFunctions.config.getValue("bachero", "letBotUseCommands")) return
	if(message.author.id == client.user.id) return // on évite les boucles infinies

	// Vérifier si ce serveur n'a pas désactivé les commandes par message
	var checkIfGuildDisabled = await bacheroFunctions.database.get(databaseTextCommandDisabledGuilds, message.guildId)
	if(checkIfGuildDisabled) return

	// Obtenir le nom de la commande
	var cmdargs = message.content?.split(botPrefix)?.[1]?.trim()?.split(" ")
	var commandName = cmdargs?.[0]?.toLowerCase() // on peut pas faire de commande slash avec majuscules

	// Vérifier si la commande existe sous forme de commande slash
	var command = client.textCommands.get(commandName)

	// Si aucune commande trouvé
	if(!command){
		var similarCommand = searchSlashCommands.search(commandName)?.[0]?.item
		return await message.reply({ embeds: [createErrorEmbed("Commande inexistante", `Cette commande est introuvable dans ${botName}.${similarCommand ? `\nVous pouvez essayer la commande \`${similarCommand}\`.` : ""}`)] })
	}

	// Vérifier qu'on est sur un serveur autorisé
	if(command?.whitelistedGuildIds?.length && !command.whitelistedGuildIds.includes(message.guildId)){
		return await message.reply({ embeds: [createErrorEmbed("Serveur interdit", "Cette commande ne peut pas être exécutée puisque ce serveur n'est pas autorisé.")] })
	}

	// Si la commande n'est pas autorisé en tant que commande texte
	if(command?.file?.slashToText == false){
		return await message.reply({ embeds: [createErrorEmbed("Utilisation interdite", "Cette commande ne peut pas être exécutée de cette manière puisqu'elle ne fonctionne que par commande slash.")] })
	}

	// Préparer la variable qui contiendra le message de réponse
	var messageResponse

	// Vérifier si c'est une commande qui contient des sous commandes ou non
	var containsSubcommand = (!!command?.file?.slashInfo?.options?.filter(op => !op.type)?.length) || false

	// Fonction pour dire que la méthode voulue n'existe pas
	async function methodNotExists(message, method){
		if(messageResponse) messageResponse.edit(`La méthode \`${method}\` n'est pas disponible dans cet environnement. Demander au créateur de ce module de porter la méthode dans le type d'environnement \`text command\`.`).catch(err => {})
		else message.reply(`La méthode \`${method}\` n'est pas disponible dans cet environnement. Demander au créateur de ce module de porter la méthode dans le type d'environnement \`text command\`.`).catch(err => {})
		throw new Error("Méthode non disponible dans cette environnement.")
	}

	// Modifier le message pour qu'il ressemble un peu plus à une interaction
	message.user = message.author
	delete message.author // pour pousser l'utilisateur à utiliser message.user --> meilleure compatibilité entre slash/texte
	message.commandName = commandName
	message.subCommandName = containsSubcommand ? cmdargs?.[1]?.toLowerCase() : null
	message.sourceType = "textCommand"
	message.options = {}
	message.awaitModalSubmit = () => methodNotExists(message, "awaitModalSubmit")
	message.showModal = () => methodNotExists(message, "awaitModalSubmit")
	message._reply = message.reply; message.reply = async (content) => {
		if(options?.ephemeral) messageResponse = await message.user.send(content).catch(err => {})
		else messageResponse = await message._reply(content).catch(err => {})
		return messageResponse
	}
	message.deferReply = async (options) => {
		if(options?.ephemeral) messageResponse = await message.user.send("Veuillez patienter pendant l'exécution de la commande...").catch(err => {})
		else messageResponse = await message.reply("Veuillez patienter pendant l'exécution de la commande...").catch(err => {})
		return messageResponse
	}
	message.fetchReply = async () => {
		return messageResponse
	}
	message.followUp = async (options) => {
		messageResponse.send(options).catch(err => {})
	}
	message.deleteReply = async () => {
		try { messageResponse.delete().catch(err => {}) } catch(err){}
	}
	message.editReply = async (content) => {
		// On modifie le message
		try {
			if(!content?.content) content.content = "​" // caractère invisible
			await messageResponse.edit(content).catch(err => {})
		} catch(err) {
			// Si on a pas pu, on vérifie qu'on peut le supprimer (et si oui, on le fait)
			if(messageResponse?.deletable) await messageResponse.delete().catch(err => {})

			// Puis on réponds
			messageResponse = await message.reply(content).catch(err => {})
		}
	}

	// Obtenir les arguments à partir du contenu du message
	var args = message.content.replace(`${bacheroFunctions.config.getValue("bachero", "prefix").endsWith(" ") ? bacheroFunctions.config.getValue("bachero", "prefix") : (`${bacheroFunctions.config.getValue("bachero", "prefix")} `)}`, "")
	// Si ça commence par le préfixe, on l'enlève
	if(args.startsWith(botPrefix)) args = args.replace(bacheroFunctions.config.getValue("bachero", "prefix"), "")
	// Enlever le nom de la commande des arguments
	if(args.includes(`${commandName} `)) args = args.replace(`${commandName} `, "")
	else if(args.includes(commandName)) args = args.replace(commandName, "")
	// Diviser les arguments avec des ";"
	if(args.includes(";")){
		// Diviser
		if(args.includes("; ")) args = args.split("; ")
		else args = args.split(";")
	}
	// Sinon, on créé un array avec le seul argument
	else args = [args]

	// On met aussi les arguments dans la variable message
	message.args = args

	// Obtenir le contenu d'un argument par son nom
	function getArg(argName, returnFirstName = false){
		// Cloner les variables
		var argsClone = JSON.parse(JSON.stringify(args)) // ne pas toucher

		// Si on veut retourner le nom du premier argument
		if(returnFirstName && containsSubcommand) return argsClone?.[0]?.split(" ")?.[0] || argsClone?.[0]
		else if(returnFirstName) return argsClone?.[1]?.split(" ")?.[0] || argsClone?.[1]

		// Si la commande contient des sous commande, enlever le premier argument avant un espace
		if(containsSubcommand){
			if(argsClone?.[0]) argsClone[0] = argsClone?.[0]?.split(" ")?.[1]
		}

		// Enlever les arguments vide
		argsClone = argsClone.filter(arg => arg?.length)

		// Si on a qu'un seul argument
		if(options.length == 1 && options[0].type != 5 && argsClone.length == 1) return argsClone[0].split(":").length == 1 ? argsClone[0] : argsClone[0].split(":").slice(1).join(":")

		// Diviser chaque argument par un ":"
		for(var i = 0; i < argsClone.length; i++){
			if(argsClone[i].includes(": ")) var argument = argsClone[i].split(": ")
			else var argument = argsClone[i].split(":")
			if(argument[0] === argName) return argument.slice(1).join(":")
		}

		// Retourner null si aucune valeur n'est trouvé
		return null
	}

	// Recréé les fonctions pour obtenir une option
	message.options.get = (parametername) => {
		return getArg(parametername)?.toString() ? getArg(parametername)?.toString() || { bacheroTypeFound: "incorrect" } : null
	}
	message.options.getString = (parametername) => {
		return getArg(parametername)?.toString() ? getArg(parametername)?.toString() || { bacheroTypeFound: "incorrect" } : null
	}
	message.options.getBoolean = (parametername) => {
		var argument = getArg(parametername)
		if(argument && argument.toLowerCase() != "false") return true
		else false
	}
	message.options.getUser = (parametername) => {
		var argument = getArg(parametername)
		if(argument){
			// Obtenir l'identifiant
			var id = argument.replace("<", "").replace(">", "").replace("@", "").replace("!", "").replace("&", "").replace("#", "").replace(" ", "")
			id = id.replace(/[^0-9]/g, "")

			// Obtenir l'utilisateur
			var user
			try {
				user = client.users.fetch(id).catch(err => {})
			} catch (error){}

			// Et le retourner
			return user?.user || user
		} else return null
	}
	message.options.getMember = (parametername) => {
		var argument = getArg(parametername)
		if(argument){
			// Obtenir l'identifiant
			var id = argument.replace("<", "").replace(">", "").replace("@", "").replace("!", "").replace("&", "").replace("#", "").replace(" ", "")
			id = id.replace(/[^0-9]/g, "")

			// Obtenir le membre
			var member
			try {
				member = message.guild.members.fetch(id).catch(err => {})
			} catch (error){}

			// Et le retourner
			return member
		} else return null
	}
	message.options.getChannel = (parametername) => {
		var argument = getArg(parametername)
		if(argument){
			// Obtenir l'identifiant
			var id = argument.replace("<", "").replace(">", "").replace("@", "").replace("!", "").replace("&", "").replace("#", "").replace(" ", "")
			id = id.replace(/[^0-9]/g, "")

			// Obtenir le salon
			var channel
			try {
				channel = message.guild.channels.fetch(id).catch(err => {})
			} catch (error){}

			// Et le retourner
			return channel
		} else return null
	}
	message.options.getRole = (parametername) => {
		var argument = getArg(parametername)
		if(argument){
			// Obtenir l'identifiant
			var id = argument.replace("<", "").replace(">", "").replace("@", "").replace("!", "").replace("&", "").replace("#", "").replace(" ", "")
			id = id.replace(/[^0-9]/g, "")

			// Obtenir le rôle
			var role
			try {
				role = message.guild.roles.fetch(id).catch(err => {})
			} catch (error){}

			// Et le retourner
			return role
		} else return null
	}
	message.options.getMentionable = (parametername) => {
		var argument = getArg(parametername)
		if(argument){
			// Obtenir l'identifiant
			var id = argument.replace("<", "").replace(">", "").replace("@", "").replace("!", "").replace("&", "").replace("#", "").replace(" ", "")
			id = id.replace(/[^0-9]/g, "")

			// Obtenir le membre ou le rôle (les seuls valeurs que la fonction originale est censé retourner)
			var member = message?.guild?.members?.cache?.get(id)
			if(member) return member
			var role = message?.guild?.roles?.cache?.get(id)
			if(role) return role

			// Et si on a rien
			return { bacheroTypeFound: "incorrect" }
		} else return null
	}
	message.options.getInteger = (parametername) => {
		var argument = getArg(parametername)
		if(!argument) return null
		if(argument && !isNaN(parseInt(argument))) return parseInt(argument)
		else return { bacheroTypeFound: "incorrect" }
	}
	message.options.getNumber = (parametername) => {
		var argument = getArg(parametername)
		if(!argument) return null
		if(argument && !isNaN(parseFloat(argument))) return parseFloat(argument)
		else return { bacheroTypeFound: "incorrect" }
	}
	message.options.getAttachment = () => {
		// Obtenir le premier attachement (pas ouf cette fonction, venez faire une PR les reufs qui regarde le code)
		var attachment = message?.attachments?.first()
		return attachment || null
	}
	message.options.getSubcommand = () => {
		// Obtenir le premier argument
		var argument = getArg(null, true)
		if(argument?.length) return argument
		else return null
	}

	// Si la commande ne doit pas être exécutée en message privé, mais qu'on est en message privé
	if(command?.file?.slashInfo?.dm_permission == false && (message.channel.type == 1 || message.channel.type == 3)){
		return message.reply({ embeds: [createErrorEmbed("Salon interdit", "Vous ne pouvez pas exécuter cette commande en message privée. Réessayer depuis un serveur.")] })
	}

	// Vérifier les permissions de l'utilisateur
	if(command?.file?.slashInfo?.default_member_permissions){
		// Obtenir les permissions
		var permissions = new PermissionsBitField(command?.file?.slashInfo?.default_member_permissions)

		// Vérifier les permissions si on est pas en dm
		if(message.channel.type != 1 && message.channel.type != 3 && !message?.guild?.members?.cache?.get(message.user.id)?.permissions?.has(permissions)){
			var array = permissions.toArray()
			return message.reply({ embeds: [createErrorEmbed("Permissions insuffisantes", `Vous n'avez pas ${array.length > 1 ? "les" : "la"} permission${array.length > 1 ? "s" : ""} nécessaire${array.length > 1 ? "s" : ""} pour exécuter cette commande. Vous devez avoir ${array.length > 1 ? "les" : "la"} permission${array.length > 1 ? "s" : ""} suivante${array.length > 1 ? "s" : ""} : \`${array.join("; ")}\``)] })
		}
	}

	// Stocker les options de la commande
	var options = command?.file?.slashInfo?.options

	// Si la commande contient des sous commandes
	if(containsSubcommand){
		// Vérifier qu'on ai entrer une sous commande
		if(!message.options.getSubcommand()) return message.reply({ embeds: [createErrorEmbed("Sous commande manquante", `Le nom de la sous commande à utiliser n'est pas spécifié. Veuillez utiliser la commande de cette façon : \`${botPrefix}${commandName} ${options?.map(op => op.name)?.join("/")}\``)] })

		// Ou si on a entré une sous commande, mais qu'elle ne fait pas partie de la liste
		if(!options?.filter(op => op.name == message.options.getSubcommand())?.length) return message.reply({ embeds: [createErrorEmbed("Sous commande invalide", `Le nom de la sous commande que vous avez entré n'existe pas. Veuillez utiliser la commande de cette façon : \`${botPrefix}${commandName} ${options?.map(op => op.name)?.join("/")}\``)] })

		// Modifier les options de la commande
		options = options?.filter(op => op.name == message.options.getSubcommand())?.[0]?.options
	}

	// Vérifier une option
	function check(value){
		if(typeof value == "object" && value?.bacheroTypeFound == "incorrect") return true
		return false
	}

	// Vérifier qu'on ait rempli toutes les options requises
	var needToStopExecution = false;
	(options || []).some(option => {
		// Si l'options est requise, vérifier qu'on l'a bien entrer
		if(option.required && !getArg(option.name)){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument manquant", `L'argument \`${option.name.replace(/`/g, "")}\` n'est pas spécifié dans la commande que vous venez d'exécuter. Veuillez utiliser la commande de cette façon : \`${botPrefix}${commandName}${message?.options?.getSubcommand()?.length ? ` ${message.options.getSubcommand()}` : ""} ${options.filter(op => op.required).map(op => `${op.name}:<un contenu>`).join("; ")}\``)] })
		}

		// Si l'option n'est pas du bon type
		if(option.type == 3 && check(message.options.getString(option.name), option.name)){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` est invalide, celui-ci doit être un \`texte\`.`)] })
		}
		if(option.type == 4 && check(message.options.getInteger(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` est invalide, celui-ci doit être un \`nombre entier\`.`)] })
		}
		if(option.type == 6 && check(message.options.getUser(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` est invalide, celui-ci doit être une \`mention vers un utilisateur\`.`)] })
		}
		if(option.type == 7 && check(message.options.getChannel(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` est invalide, celui-ci doit être une \`mention vers un salon\`.`)] })
		}
		if(option.type == 8 && check(message.options.getRole(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` est invalide, celui-ci doit être une \`mention vers un rôle\`.`)] })
		}
		if(option.type == 9 && check(message.options.getMentionable(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` est invalide, celui-ci doit être une \`mention vers un utilisateur ou un rôle\`.`)] })
		}
		if(option.type == 10 && check(message.options.getNumber(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` est invalide, celui-ci doit être un \`nombre\`.`)] })
		}

		// Si c'est un nombre ou un int, vérifier les valeurs minimum
		if(option.type == 10 && message.options.getNumber(option.name) < option.min_value){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` doit être un nombre supérieure à ${option.min_value}.`)] })
		}
		if(option.type == 4 && message.options.getInteger(option.name) < option.min_value){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` doit être un nombre entier supérieure à ${option.min_value}.`)] })
		}

		// Si c'est un nombre ou un int, vérifier les valeurs MAXIMUM
		if(option.type == 10 && option.min_value && message.options.getNumber(option.name) > option.max_value){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` doit être un nombre inférieure à ${option.max_value}.`)] })
		}
		if(option.type == 4 && option.max_value && message.options.getInteger(option.name) > option.max_value){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` doit être un nombre entier inférieure à ${option.max_value}.`)] })
		}

		// Si c'est un string, vérifier la taille minimal et maximal
		if(option.type == 3 && option.min_length && message.options.getString(option.name)?.length < option.min_length){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` doit faire au moins ${option.min_length} caractères.`)] })
		}
		if(option.type == 3 && option.max_length && message.options.getString(option.name)?.length > option.max_length){
			needToStopExecution = true
			return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` doit faire moins de ${option.max_length} caractères.`)] })
		}

		// Si c'est un string et qu'il a des choix disponibles, les vérifier
		if(option.type == 3 && message.options.getString(option.name)?.length && option?.choices?.length){
			// Si on a mit le nom au lieu de la valeur, modifier ça
			var getChoice = option?.choices?.find(choice => choice?.name?.toLowerCase() == message.options.getString(option?.name)?.toLowerCase() || choice?.value?.toLowerCase() == message.options.getString(option?.name)?.toLowerCase())
			if(getChoice?.value) args[args.findIndex(arg => arg.startsWith(`${option.name}:`))] = `${option.name}:${getChoice?.value}`

			// Si la valeur n'est pas dans les choix, envoyer une erreur
			if(!option?.choices?.find(choice => choice?.value?.toLowerCase() == message.options.getString(option?.name)?.toLowerCase())){
				needToStopExecution = true
				return message.reply({ embeds: [createErrorEmbed("Argument invalide", `L'argument \`${option.name.replace(/`/g, "")}\` doit faire parti de la liste suivante : ${option.choices.map(choice => choice.name).join("; ")}.`)] })
			}
		}
	})
	if(needToStopExecution == true) return

	// Exécuter la commande
	try {
		await command.file.execute(message)
	} catch (error){
		bacheroFunctions.showLog("warn", `${message.user.discriminator == "0" ? message.user.username : message.user.tag} a exécuté la commande texte ${chalk.yellow(message.commandName)} qui a fini en une erreur :`, "user-textcommand-error")
		bacheroFunctions.showLog("warn", error.stack || error, "user-textcommand-error", true, true)
		try {
			messageResponse = message.reply({ embeds: [createErrorEmbed("Une erreur est survenue", `Un problème est survenu lors de l'exécution de la commande :\n\`\`\`\n${error?.toString()?.replace(/`/g, " `") || error}\n\`\`\``, "dangerEmbedColor", true)] }).catch(err => {})
		} catch (error){
			await messageResponse.edit({ embeds: [createErrorEmbed("Une erreur est survenue", `Un problème est survenu lors de l'exécution de la commande :\n\`\`\`\n${error?.toString()?.replace(/`/g, " `") || error}\n\`\`\``, "dangerEmbedColor", true)] }).catch(err => {})
		}
	}
})

// Générer un fichier pour les commandes slash
function textCommandCompatibility(fileName){
	// Lire le fichier
	var file = fs.readFileSync(fileName, "utf8")

	// Modifier quelques éléments du code pour une meilleure compatibilité
	// btw si vous voulez contribuer à faire un meilleur truc que ce machin tout sauf optimisé, je suis preneur
	file = file.replaceAll("interaction?.message?.interaction", "interaction.message.interaction")
	file = file.replaceAll("interaction.message.interaction", "interaction?.message")
	file = file.replaceAll("interactionListener(", "interactionListenerText(")
	file = file.replaceAll("interactionListener (", "interactionListenerText (")
	file = file.replaceAll("interaction?.message?.user", "(await interaction?.message?.channel?.messages.fetch(interaction?.message?.reference?.messageId))?.author")

	// Créé un dossier temporaire qui contiendra les fichiers modifiés
	fs.mkdirSync(path.join(__dirname, "TEMP_bachero_textcommandcompatibility", `${path.join(fileName.replace(path.join(__dirname, "modules"), ""), "..")}`), { recursive: true })

	// Minifier le code et l'enregistrer
	if(UglifyJS) var compressedJS = UglifyJS.minify(file, { warnings: true })
	fs.writeFileSync(path.join(__dirname, "TEMP_bachero_textcommandcompatibility", `${fileName.replace(path.join(__dirname, "modules"), "")}`), compressedJS?.code || file)

	// Retourner le chemin du fichier
	return path.join(__dirname, "TEMP_bachero_textcommandcompatibility", `${fileName.replace(path.join(__dirname, "modules"), "")}`)
}

// Une fois connecté à Discord
client.on("ready", async () => {
	// Afficher un message dans les logs
	var performanceStop = performance.now()
	var inSeconds = (performanceStop - performanceStart) / 1000
	bacheroFunctions.showLog("info", `Connecté à Discord en tant que ${chalk.yellow(client.user.tag)} après ${chalk.yellow(Number(inSeconds).toFixed(3))} secondes`, "bot-ready")

	// On attend que tout les modules soient chargés
	while(!client.isAllModulesLoaded) await new Promise(resolve => setTimeout(resolve, 2000))
	createCommands()

	// Définir le bot dans la fonction
	bacheroFunctions.botClient._set(client)

	// Donner le client aux modules via la fonction exporté
	allGetClientsFunctions.forEach(func => {
		func(client)
	})
})