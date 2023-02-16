// Commencer à mesurer le temps que le bot a pris pour s'allumer
var performanceStart = performance.now()

// Importer quelques librairies
const fs = require('fs')
const path = require('path')
const jsonc = require('jsonc')
const { EventEmitter } = require('events')
const bacheroFunctions = require('./functions')
require('dotenv').config()

// Obtenir quelques variables en plus
var optimized = process.argv.includes('--optimize')
var hideUnimportantLogs = process.argv.includes('--hide-unimportant-logs')
var botPrefix = bacheroFunctions.config.getValue('bachero', 'prefix')

// Importer des modules et définir des variables en fonction du mode optimisé
var chalk
var UglifyJS
var statsDatabase
var botName
var disableTextCommand
if(optimized){
	chalk = { red: (text) => text, yellow: (text) => text, green: (text) => text, blue: (text) => text }
	botName = "Bachero"
	disableTextCommand = true
} else {
	chalk = require('chalk')
	UglifyJS = require('uglify-js')
	botName = bacheroFunctions.config.getValue('bachero', 'botName')
	statsDatabase = bacheroFunctions.database.getDatabase('internalBachero.stats')
	disableTextCommand = bacheroFunctions.config.getValue('bachero', 'disableTextCommand')
}

// Créé quelques listeners
var interactionListener = new EventEmitter();
var interactionListenerText = new EventEmitter()

// Vérifier les cooldown persistants dans la base de données
async function checkPersistentCooldowns(){
	var allCooldown = await bacheroFunctions.database.getAll(bacheroFunctions.database.getDatabase('persistantCooldown'))
	for(var cooldown of Object.values(allCooldown)){
		// Si le cooldown est expiré, le supprimer
		if(cooldown.expireDate < Date.now()) await bacheroFunctions.database.delete(bacheroFunctions.database.getDatabase('persistantCooldown'), `${cooldown.cooldownId}-${cooldown.userId}`)
	}
}; checkPersistentCooldowns()

// Fonction pour vérifier si un module existe
function moduleExists(moduleName){
	try {
		require.resolve(moduleName)
		return true
	} catch (e){
		return false
	}
}

// Importer et initialiser un bot Discord
const { REST } = require('@discordjs/rest')
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)
const { Client, GatewayIntentBits, PermissionsBitField, Partials, EmbedBuilder, Routes, ActivityType } = require('discord.js')
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
	]
})

// Quelques maps pour le client
client.commands = new Map()
client.contextsMenus = new Map()
client.allModulesDetails = new Map()
client.textCommands = new Map()

// Obtenir la liste des modules et préparer une variable
var modulesFolder = process.argv.find(arg => arg.startsWith('--load-modules='))?.split('=')?.[1]?.split(',') || fs.readdirSync(path.join(__dirname, 'modules'))
var allModules = []
var allSlashCommands = []
var allGetClientsFunctions = []

// Charger et vérifier tout les modules
function loadModules(){
	if(!modulesFolder.length) createCommands() // Si on a aucun module, on met à jour les commandes (pour supprimer celles qui sont déjà présentes côté Discord)
	for(var module of modulesFolder){
		// Lire le fichier manifest.jsonc
		var manifest
		try {
			manifest = jsonc.parse(fs.readFileSync(path.join(__dirname, 'modules', module, 'manifest.jsonc'), 'utf8'))
		} catch (e){
			manifest = null
		}

		// Préparer la liste des erreurs du module
		var errors = []

		// Si le fichier manifeste n'existe même pas
		if(!manifest) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc n'existe pas ou est invalide.`)

		// Si le fichier est désactivé, passer au prochain
		if(manifest?.disabled) continue

		// Si on est en mode optimisé, ne pas vérifier les valeurs du manifeste
		if(!optimized){
			// Vérifier qu'il contient les valeurs nécessaires
			if(!manifest?.packageName) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow('packageName')}.`)
			if(!manifest?.name) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow('name')}.`)
			if(!manifest?.shortDescription) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow('shortDescription')}.`)
			if(!manifest?.authors) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow('authors')}.`)
			if(!manifest?.files) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc ne contient pas la valeur ${chalk.yellow('files')}.`)

			// Vérifier que les valeurs nécessaires sont de bon type
			if(typeof manifest?.packageName != 'string') errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow('packageName')} n'est pas de type ${chalk.yellow('string')}.`)
			if(typeof manifest?.name != 'string') errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow('name')} n'est pas de type ${chalk.yellow('string')}.`)
			if(typeof manifest?.shortDescription != 'string') errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow('shortDescription')} n'est pas de type ${chalk.yellow('string')}.`)
			if(typeof manifest?.authors != 'object') errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow('authors')} n'est pas de type ${chalk.yellow('array')}.`)
			if(typeof manifest?.files != 'object') errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : la valeur ${chalk.yellow('files')} n'est pas de type ${chalk.yellow('array')}.`)

			// Si un module avec le même nom de packet existe déjà
			if(allModules.find(moduleA => moduleA.packageName == manifest.packageName)) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : un module avec le même nom de packet existe déjà.`)
			if(allModules.find(moduleA => moduleA.packageName == module)) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : un module avec le même nom de packet existe déjà.`)

			// Vérifier que les librairies nécessaires existent
			if(manifest?.dependencies) for(var dependencie of manifest.dependencies){
				if(!moduleExists(dependencie)) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : la librairie ${chalk.yellow(dependencie)} n'est pas installée (${chalk.yellow('npm i ' + dependencie)}).`)
			}

			// Vérifier que les fichiers existent
			for(var file of manifest?.files || []){
				if(!fs.existsSync(path.join(__dirname, 'modules', module, file))) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : le fichier ${chalk.yellow(file)} n'existe pas.`)
			}
		}

		// Si il y a des erreurs
		if(errors.length > 0){
			console.error(errors.join('\n'))
			return process.exit()
		}

		// Si le module a besoin d'un fichier de configuration
		if(manifest?.config && manifest?.config?.length){
			// Construire un objet qui contiendra les valeurs de configuration
			var config = {"config": []}
			for(var c of manifest.config){
				config.config.push({
					name: c.name,
					type: c.type,
					default: c.default,
					value: c.default,
					description: c.description,
				})
			}

			// Si le fichier n'existe pas, le créer
			if(!fs.existsSync(path.join(__dirname, 'config', `${module}.jsonc`))){
				fs.writeFileSync(path.join(__dirname, 'config', `${module}.jsonc`), JSON.stringify(config, null, 4))
				if(!hideUnimportantLogs) console.log(chalk.blue("[INFO] ") + `Un fichier de configuration a été créé pour le module ${chalk.yellow(module)}.`)
			}
		}

		// Ajouter le module à la liste des modules
		allModules.push(manifest)

		// Ajouter les commandes slash et menus contextuel
		var thisModuleAllCommands = []
		var thisModuleAllContextsMenu = []
		for(var fileName of manifest?.files){
			// Obtenir le fichier
			var file = require(path.join(__dirname, 'modules', module, fileName))

			// Modifier le fichier pour la compatibilité des text commands
			if(disableTextCommand != true) var editedfile = require(textCommandCompatibility(path.join(__dirname, 'modules', module, fileName)))

			// En profiter pour donner au module le listener
			if(file?.interactionListener) file.interactionListener(interactionListener)
			if(editedfile?.interactionListenerText) editedfile.interactionListenerText(interactionListenerText)

			// Si il y a des commandes slash
			if(file?.slashInfo && file?.execute){
				if(allSlashCommands.find(slashCommand => slashCommand.name == file.slashInfo.name)){
					console.error(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : une commande slash avec le même nom existe déjà.`)
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
					console.error(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : un menu cotnextuel avec le même nom existe déjà.`)
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
			authors: manifest.authors.map(a => a.name || a.discordId || a || 'Inconnu'),
			commands: thisModuleAllCommands,
			contextsMenus: thisModuleAllContextsMenu,
			source: manifest.source,
			whitelistedGuildIds: manifest.whitelistedGuildIds,
			file: file
		})

		// Afficher le message une fois démarré
		if(!hideUnimportantLogs) console.log(chalk.green("[OK] ") + `Module ${chalk.yellow(manifest.packageName)} chargé${manifest?.onloadMessage ? ` (${manifest?.onloadMessage})` : ''}.`)

		// Si c'était le dernier module de la liste
		if(module == modulesFolder[modulesFolder.length - 1]) createCommands()
	}
}; loadModules()

// Crée les commandes
async function createCommands(){
	try {
		if(!hideUnimportantLogs) console.log(chalk.blue("[INFO] ") + 'Actualisation des commandes slashs commencées...')
		await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: allSlashCommands })
		console.log(chalk.blue("[INFO] ") + 'Actualisation des commandes slashs terminées')
	} catch (error){
		console.warn(chalk.yellow("[WARN] ") + "Impossible d'actualiser les commandes slashs.")
		console.warn(error)
	}

	// Une fois que tout ça est fait, on vérifie les mises à jour
	if(!optimized) checkUpdates()
}

// Vérifier les mises à jour
async function checkUpdates(){
	// Si la vérification est désactivé
	if(bacheroFunctions.config.getValue('bachero', 'disableCheckUpdate') == true) return

	// Obtenir la date de dernière vérification
	var lastUpdateCheck = await bacheroFunctions.database.get(statsDatabase, 'lastUpdateCheck')

	// Si la date n'était pas il y a plus d'un jour, annuler
	if(lastUpdateCheck && lastUpdateCheck > Date.now() - 1000 * 60 * 60 * 24) return

	// Mettre à jour la date de dernière vérification
	await bacheroFunctions.database.set(statsDatabase, 'lastUpdateCheck', Date.now())

	// Obtenir les mises à jour
	var latestPackageJson = await require('node-fetch')('https://raw.githubusercontent.com/bacherobot/bot/master/package.json').then(res => res.text())

	// Tenter de parse en JSON
	try {
		latestPackageJson = JSON.parse(latestPackageJson)
	} catch (e){
		console.warn(chalk.yellow("[WARN] (MAJ) ") + "Vérifications des mises à jours annulées, impossible d'obtenir le package.json de la dernière version :")
		console.warn(e)
		latestPackageJson = {}
	}

	// Vérifier la version
	var actualVersion = require(path.join(__dirname, 'package.json')).version
	if(latestPackageJson.version != actualVersion){
		console.log(chalk.blue("[INFO] (MAJ) ") + `Une mise à jour de Bachero est disponible, ${chalk.yellow(actualVersion)} → ${chalk.yellow(latestPackageJson.version)}, https://github.com/bacherobot/bot/releases/tag/${latestPackageJson.version}`)
	}
}

// Quand on reçoit une interaction
client.on('interactionCreate', async interaction => {
	// Si c'est un bouton ou un modal, l'envoyer via le listener
	if(interaction.isModalSubmit()){
		if(interaction?.message?.type == 20 || interaction?.message?.type == 23) return interactionListener.emit('modal', interaction) // "CHAT_INPUT_COMMAND" / "CONTEXT_MENU_COMMAND"
		else if(interaction?.message?.type) return interactionListenerText.emit('modal', interaction)
		else interactionListener.emit('modal', interaction)
	}
	if(interaction.isButton()){
		if(interaction?.message?.type == 20 || interaction?.message?.type == 23) return interactionListener.emit('button', interaction) // "CHAT_INPUT_COMMAND" / "CONTEXT_MENU_COMMAND"
		else if(interaction?.message?.type) return interactionListenerText.emit('button', interaction)
		else return interactionListener.emit('button', interaction)
	}

	// Si c'est un menu contextuel
	if(interaction.isUserContextMenuCommand()){
		// Récupérer le menu par son nom
		var contextMenu = client.contextsMenus.get(interaction.commandName)

		// Si aucune résultat
		if(!contextMenu){
			console.warn(chalk.yellow("[WARN] ") + `${interaction.user.tag} a exécuté le menu contextuel ${chalk.yellow(interaction.commandName)} qui n'existe pas.`)
			return await interaction.reply({ embeds: [new EmbedBuilder().setTitle("Menu contextuel inexistant").setDescription(`Ce menu contextuel est introuvable dans ${botName}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false })
		}

		// Vérifier qu'on est sur un serveur autorisé
		if(contextMenu?.whitelistedGuildIds?.length && !contextMenu.whitelistedGuildIds.includes(interaction.guildId)){
			return await interaction.reply({ embeds: [new EmbedBuilder().setTitle("Serveur interdit").setDescription(`Ce menu contextuel ne peut pas être exécuté puisque ce serveur n'est pas autorisé.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))], ephemeral: true })
		}

		// Exécuter la commande
		try {
			interaction.sourceType = 'contextMenu'
			await contextMenu.file.execute(interaction)
		} catch (error){
			console.warn(chalk.yellow("[WARN] ") + `${interaction.user.tag} a exécuté le menu contextuel ${chalk.yellow(interaction.commandName)} qui a fini en une erreur :`)
			console.warn(error)
			try {
				interaction.reply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution du menu contextuel :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false }).catch(err => {})
			} catch (error){
				await interaction.editReply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution du menu contextuel :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false }).catch(err => {})
			}
		}
	}

	// Et si c'est une commande slash
	else if(interaction.isCommand()){
		// Récupérer la commande par son nom
		var command = client.commands.get(interaction.commandName)

		// Si aucune commande trouvé
		if(!command){
			console.warn(chalk.yellow("[WARN] ") + `${interaction.user.tag} a exécuté la commande slash ${chalk.yellow(interaction.commandName)} qui n'existe pas.`)
			return await interaction.reply({ embeds: [new EmbedBuilder().setTitle("Commande inexistante").setDescription(`Cette commande est introuvable dans ${botName}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false })
		}

		// Vérifier qu'on est sur un serveur autorisé
		if(command?.whitelistedGuildIds?.length && !command.whitelistedGuildIds.includes(interaction.guildId)){
			return await interaction.reply({ embeds: [new EmbedBuilder().setTitle("Serveur interdit").setDescription(`Cette commande ne peut pas être exécuté puisque ce serveur n'est pas autorisé.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))], ephemeral: true })
		}

		// Exécuter la commande
		try {
			interaction.sourceType = 'slashCommand'
			await command.file.execute(interaction)
		} catch (error){
			console.warn(chalk.yellow("[WARN] ") + `${interaction.user.tag} a exécuté la commande slash ${chalk.yellow(interaction.commandName)} qui a fini en une erreur :`)
			console.warn(error)
			try {
				interaction.reply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false }).catch(err => {})
			} catch (error){
				await interaction.editReply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false }).catch(err => {})
			}
		}
	}
})

// Quand le bot reçoit un message
client.on('messageCreate', async message => {
	// Répondre à ElWatch
	if(message.content === "Hello from ElWatch!" && message.author.bot && message.author.id === "898255769827430460") return message.reply(":eye:")

	// Si on a désactivé les commandes par message, ignorer la suite du code
	if(disableTextCommand) return

	// Empêcher les bots
	if(message.author.bot) return

	// Uniquement si c'est le bon prefix
	if(!message.content.startsWith(botPrefix)) return

	// Obtenir le nom de la commande
	var cmdargs = message.content?.split(botPrefix)?.[1]?.trim()?.split(' ')
	var commandName = cmdargs?.[0]?.toLowerCase() // on peut pas faire de commande slash avec majuscules

	// Vérifier si la commande existe sous forme de commande slash
	var command = client.textCommands.get(commandName)

	// Si aucune commande trouvé
	if(!command){
		return await message.reply({ embeds: [new EmbedBuilder().setTitle("Commande inexistante").setDescription(`Cette commande est introuvable dans ${botName}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})] })
	}

	// Vérifier qu'on est sur un serveur autorisé
	if(command?.whitelistedGuildIds?.length && !command.whitelistedGuildIds.includes(message.guildId)){
		return await message.reply({ embeds: [new EmbedBuilder().setTitle("Serveur interdit").setDescription(`Cette commande ne peut pas être exécutée puisque ce serveur n'est pas autorisé.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
	}

	// Si la commande n'est pas autorisé en tant que commande texte
	if(command?.file?.slashToText == false){
		return await message.reply({ embeds: [new EmbedBuilder().setTitle("Utilisation interdite").setDescription(`Cette commande ne peut pas être exécutée de cette manière puisqu'elle ne fonctionne que par commande slash.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
	}

	// Préparer la variable qui contiendra le message de réponse
	var messageResponse

	// Vérifier si c'est une commande qui contient des sous commandes ou non
	var containsSubcommand = (command?.file?.slashInfo?.options?.filter(op => !op.type)?.length ? true : false) || false

	// Fonction pour dire que la méthode voulue n'existe pas
	async function methodNotExists(message, method){
		if(messageResponse) messageResponse.edit(`La méthode \`${method}\` n'est pas disponible dans cet environnement. Demander au créateur de ce module de porter la méthode dans le type d'environnement \`text command\`.`)
		else message.reply(`La méthode \`${method}\` n'est pas disponible dans cet environnement. Demander au créateur de ce module de porter la méthode dans le type d'environnement \`text command\`.`)
		throw new Error('Méthode non disponible dans cette environnement.')
	}

	// Modifier le message pour qu'il ressemble un peu plus à une interaction
	message.user = message.author
	delete message.author
	message.commandName = commandName
	message.sourceType = 'textCommand'
	message.options = {}
	message.awaitModalSubmit = () => methodNotExists(message, 'awaitModalSubmit')
	message.showModal = () => methodNotExists(message, 'awaitModalSubmit')
	message._reply = message.reply; message.reply = async (content) => {
		if(options?.ephemeral) messageResponse = await message.user.send(content)
		else messageResponse = await message._reply(content)
		return messageResponse
	}
	message.deferReply = async (options) => {
		if(options?.ephemeral) messageResponse = await message.user.send('Veuillez patienter pendant l\'exécution de la commande...')
		else messageResponse = await message.reply('Veuillez patienter pendant l\'exécution de la commande...')
		return messageResponse
	}
	message.fetchReply = async () => {
		return messageResponse
	}
	message.followUp = async (options) => {
		messageResponse.send(options)
	}
	message.deleteReply = async () => {
		try { messageResponse.delete() } catch(err){}
	}
	message.editReply = async (content) => {
		// On modifie le message
		try {
			if(!content?.content) content.content = "​" // caractère invisible
			await messageResponse.edit(content)
		} catch(err) {
			// Si on a pas pu, on vérifie qu'on peut le supprimer (et si oui, on le fait)
			if(messageResponse?.deletable) await messageResponse.delete()

			// Puis on réponds
			messageResponse = await message.reply(content)
		}
	}

	// Obtenir les arguments à partir du contenu du message
	var args = message.content.replace(bacheroFunctions.config.getValue('bachero', 'prefix') + ' ', '')
	// Si ça commence par le préfixe, on l'enlève
	if(args.startsWith(botPrefix)) args = args.replace(bacheroFunctions.config.getValue('bachero', 'prefix'), '')
	// Enlever le nom de la commande des arguments
	args = args.replace(commandName + ' ', '')
	// if(args.startsWith(commandName)) args = args.replace(commandName, '') // casse la commande color quand on utilise l'argument "color" (même nom que la cmd)
	// Diviser les arguments avec des ";"
	if(args.includes(';')){
		// Diviser
		if(args.includes('; ')) args = args.split('; ')
		else args = args.split(';')
	}
	// Sinon, on créé un array avec le seul argument
	else args = [args]

	// Obtenir le contenu d'un argument par son nom
	function getArg(argName, returnFirstName=false){
		// Cloner les variables
		var argsClone = JSON.parse(JSON.stringify(args)) // ne pas toucher

		// Si on veut retourner le nom du premier argument
		if(returnFirstName && containsSubcommand) return argsClone?.[0]?.split(' ')?.[0] || argsClone?.[0]
		else if(returnFirstName) return argsClone?.[1]?.split(' ')?.[0] || argsClone?.[1]

		// Si la commande contient des sous commande, enlever le premier argument avant un espace
		if(containsSubcommand){
			if(argsClone?.[0]) argsClone[0] = argsClone?.[0]?.split(' ')?.[1]
		}

		// Enlever les arguments vide
		argsClone = argsClone.filter(arg => arg?.length)

		// Diviser chaque argument par un ":"
		for(var i = 0; i < argsClone.length; i++){
			if(argsClone[i].includes(': ')) argument = argsClone[i].split(': ')
			else argument = argsClone[i].split(':')
			if(argument[0] === argName) return argument.slice(1).join(':')
		}

		// Retourner null si aucune valeur n'est trouvé
		return null
	}

	// Recréé les fonctions pour obtenir une option
	message.options.get = (parametername) => {
		return getArg(parametername)?.toString() ? getArg(parametername)?.toString() || {bacheroTypeFound:'incorrect'} : null
	}
	message.options.getString = (parametername) => {
		return getArg(parametername)?.toString() ? getArg(parametername)?.toString() || {bacheroTypeFound:'incorrect'} : null
	}
	message.options.getBoolean = (parametername) => {
		var argument = getArg(parametername)
		if(argument && argument.toLowerCase() != 'false') return true
		else false
	}
	message.options.getUser = (parametername) => {
		var argument = getArg(parametername)
		if(argument){
			// Obtenir l'identifiant
			var id = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '')
			id = id.replace(/[^0-9]/g, '')

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
			var id = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '')
			id = id.replace(/[^0-9]/g, '')

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
			var id = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '')
			id = id.replace(/[^0-9]/g, '')

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
			var id = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '')
			id = id.replace(/[^0-9]/g, '')

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
			var id = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '')
			id = id.replace(/[^0-9]/g, '')

			// Obtenir le membre ou le rôle (les seuls valeurs que la fonction originale est censé retourner)
			var member = message?.guild?.members?.cache?.get(id)
			if(member) return member
			var role = message?.guild?.roles?.cache?.get(id)
			if(role) return role

			// Et si on a rien
			return {bacheroTypeFound:'incorrect'}
		} else return null
	}
	message.options.getInteger = (parametername) => {
		var argument = getArg(parametername)
		if(!argument) return null
		if(argument && !isNaN(parseInt(argument))) return parseInt(argument)
		else return {bacheroTypeFound:'incorrect'}
	}
	message.options.getNumber = (parametername) => {
		var argument = getArg(parametername)
		if(!argument) return null
		if(argument && !isNaN(parseFloat(argument))) return parseFloat(argument)
		else return {bacheroTypeFound:'incorrect'}
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
		return message.reply({ embeds: [new EmbedBuilder().setTitle("Salon invalide").setDescription(`Vous ne pouvez pas exécuter cette commande en message privée. Réessayer depuis un serveur.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
	}

	// Vérifier les permissions de l'utilisateur
	if(command?.file?.slashInfo?.default_member_permissions){
		// Obtenir les permissions
		var permissions = new PermissionsBitField(command?.file?.slashInfo?.default_member_permissions)

		// Vérifier les permissions si on est pas en dm
		if(message.channel.type != 1 && message.channel.type != 3 && !message?.guild?.members?.cache?.get(message.user.id)?.permissions?.has(permissions)){
			var array = permissions.toArray()
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Permissions insuffisantes").setDescription(`Vous n'avez pas ${array.length > 1 ? 'les' : 'la'} permission${array.length > 1 ? 's' : ''} nécessaire${array.length > 1 ? 's' : ''} pour exécuter cette commande. Vous devez avoir ${array.length > 1 ? 'les' : 'la'} permission${array.length > 1 ? 's' : ''} suivante${array.length > 1 ? 's' : ''} : \`${array.join('; ')}\``).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
	}

	// Stocker les options de la commande
	var options = command?.file?.slashInfo?.options

	// Si la commande contient des sous commandes
	if(containsSubcommand){
		// Vérifier qu'on ai entrer une sous commande
		if(!message.options.getSubcommand()) return message.reply({ embeds: [new EmbedBuilder().setTitle("Sous commande manquante").setDescription(`Le nom de la sous commande à utiliser n'est pas spécifié. Veuillez utiliser la commande de cette façon : \`${botPrefix} ${commandName} ${options?.map(op => op.name)?.join('/')}\``).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })

		// Ou si on a entré une sous commande, mais qu'elle ne fait pas partie de la liste
		if(!options?.filter(op => op.name == message.options.getSubcommand())?.length) return message.reply({ embeds: [new EmbedBuilder().setTitle("Sous commande invalide").setDescription(`Le nom de la sous commande que vous avez entré n'existe pas. Veuillez utiliser la commande de cette façon : \`${botPrefix} ${commandName} ${options?.map(op => op.name)?.join('/')}\``).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })

		// Modifier les options de la commande
		options = options?.filter(op => op.name == message.options.getSubcommand())?.[0]?.options
	}

	// Vérifier une option
	function check(value){
		if(typeof value == 'object' && value?.bacheroTypeFound == 'incorrect') return true
		return false
	}

	// Vérifier qu'on ait rempli toutes les options requises
	var needToStopExecution = false;
	(options || []).some(option => {
		// Si l'options est requise, vérifier qu'on l'a bien entrer
		if(option.required && !getArg(option.name)){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument manquant").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` n'est pas spécifié dans la commande que vous venez d'exécuter. Veuillez utiliser la commande de cette façon : \`${botPrefix} ${commandName}${message?.options?.getSubcommand()?.length ? ' ' + message.options.getSubcommand() : ''} ${options.filter(op => op.required).map(op => `${op.name}:<un contenu>`).join('; ')}\``).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}

		// Si l'option n'est pas du bon type
		if(option.type == 3 && check(message.options.getString(option.name), option.name)){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` est invalide, celui-ci doit être un \`texte\`.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
		if(option.type == 4 && check(message.options.getInteger(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` est invalide, celui-ci doit être un \`nombre entier\`.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
		if(option.type == 6 && check(message.options.getUser(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` est invalide, celui-ci doit être une \`mention vers un utilisateur\`.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
		if(option.type == 7 && check(message.options.getChannel(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` est invalide, celui-ci doit être une \`mention vers un salon\`.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
		if(option.type == 8 && check(message.options.getRole(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` est invalide, celui-ci doit être une \`mention vers un rôle\`.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
		if(option.type == 9 && check(message.options.getMentionable(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` est invalide, celui-ci doit être une \`mention vers un utilisateur ou un rôle\`.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
		if(option.type == 10 && check(message.options.getNumber(option.name))){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` est invalide, celui-ci doit être un \`nombre\`.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}

		// Si c'est un nombre ou un int, vérifier les valeurs minimum
		if(option.type == 10 && message.options.getNumber(option.name) < option.min_value){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` doit être un nombre supérieure à ${option.min_value}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
		if(option.type == 4 && message.options.getInteger(option.name) < option.min_value){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` doit être un nombre entier supérieure à ${option.min_value}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}

		// Si c'est un nombre ou un int, vérifier les valeurs MAXIMUM
		if(option.type == 10 && option.min_value && message.options.getNumber(option.name) > option.max_value){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` doit être un nombre inférieure à ${option.max_value}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
		if(option.type == 4 && option.max_value && message.options.getInteger(option.name) > option.max_value){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` doit être un nombre entier inférieure à ${option.max_value}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}

		// Si c'est un string, vérifier la taille minimal et maximal
		if(option.type == 3 && option.min_length && message.options.getString(option.name)?.length < option.min_length){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` doit faire au moins ${option.min_length} caractères.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}
		if(option.type == 3 && option.max_length && message.options.getString(option.name)?.length > option.max_length){
			needToStopExecution = true
			return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` doit faire moins de ${option.max_length} caractères.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
		}

		// Si c'est un string et qu'il a des choix disponibles, les vérifier
		if(option.type == 3 && message.options.getString(option.name)?.length && option?.choices?.length){
			// Si on a mit le nom au lieu de la valeur, modifier ça
			var getChoice = option?.choices?.find(c => c?.name?.toLowerCase() == message.options.getString(option?.name)?.toLowerCase() || c?.value?.toLowerCase() == message.options.getString(option?.name)?.toLowerCase())
			if(getChoice?.value) args[args.findIndex(a => a.startsWith(`${option.name}:`))] = `${option.name}:${getChoice?.value}`

			// Si la valeur n'est pas dans les choix, envoyer une erreur
			if(!option?.choices?.find(c => c?.value?.toLowerCase() == message.options.getString(option?.name)?.toLowerCase())){
				needToStopExecution = true
				return message.reply({ embeds: [new EmbedBuilder().setTitle("Argument invalide").setDescription(`L'argument \`${option.name.replace(/`/g, '')}\` doit faire parti de la liste suivante : ${option.choices.map(c => c.name).join('; ')}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
			}
		}
	})
	if(needToStopExecution == true) return

	// Exécuter la commande
	try {
		await command.file.execute(message)
	} catch (error){
		console.warn(chalk.yellow("[WARN] ") + `${message.user.tag} a exécuté la commande texte ${chalk.yellow(`${commandName}${message?.options?.getSubcommand()?.length ? ' ' + message.options.getSubcommand() : ''}`)} qui a fini en une erreur :`)
		console.warn(error)
		try {
			messageResponse = message.reply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})] }).catch(err => {})
		} catch (error){
			await messageResponse.edit({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})] }).catch(err => {})
		}
	}
})

// Générer un fichier pour les commandes slash
function textCommandCompatibility(fileName){
	// Lire le fichier
	var file = fs.readFileSync(fileName, 'utf8')

	// Modifier quelques éléments du code pour une meilleure compatibilité
	// btw si vous voulez contribuer à faire un meilleur truc que ce machin tout sauf optimisé, je suis preneur
	file = file.replaceAll('interaction?.message?.interaction', 'interaction.message.interaction')
	file = file.replaceAll('interaction.message.interaction', 'interaction?.message')
	file = file.replaceAll('interactionListener(', 'interactionListenerText(')
	file = file.replaceAll('interactionListener (', 'interactionListenerText (')
	file = file.replaceAll('interaction?.message?.user', '(await interaction?.message?.channel?.messages.fetch(interaction?.message?.reference?.messageId))?.author')

	// Créé un dossier temporaire qui contiendra les fichiers modifiés
	fs.mkdirSync(path.join(__dirname, 'TEMP_bachero_textcommandcompatibility', `${path.join(fileName.replace(path.join(__dirname, 'modules'), ''), '..')}`), { recursive: true })

	// Minifier le code et l'enregistrer
	if(UglifyJS) var compressedJS = UglifyJS.minify(file)
	fs.writeFileSync(path.join(__dirname, 'TEMP_bachero_textcommandcompatibility', `${fileName.replace(path.join(__dirname, 'modules'), '')}`), compressedJS?.code || file)

	// Retourner le chemin du fichier
	return path.join(__dirname, 'TEMP_bachero_textcommandcompatibility', `${fileName.replace(path.join(__dirname, 'modules'), '')}`)
}

// Une fois connecté à Discord
client.on('ready', () => {
	// Afficher un message dans la console
	var performanceStop = performance.now()
	var inSeconds = (performanceStop - performanceStart) / 1000
	console.log(chalk.blue("[INFO] ") + `Connecté à Discord en tant que ${chalk.yellow(client.user.tag)} après ${chalk.yellow(Number(inSeconds).toFixed(3))} secondes`)

	// Définir le bot dans la fonction
	bacheroFunctions.botClient._set(client)

	// Changer le statut
	var botActivityContent = bacheroFunctions.config.getValue('bachero', 'botActivityContent')
	var botActivityType = bacheroFunctions.config.getValue('bachero', 'botActivityType')
	botActivityType = { 'playing': ActivityType.Playing, 'streaming': ActivityType.Streaming, 'watching': ActivityType.Watching, 'listening': ActivityType.Listening, 'competing': ActivityType.Competing }[botActivityType?.toLowerCase() || 'playing']
	if(botActivityContent?.length) client.user.setPresence({ activities: [{ name: botActivityContent, type: botActivityType }], status: (bacheroFunctions.config.getValue('bachero', 'botStatus') || 'online') })

	// Donner le client aux modules via la fonction exporté
	allGetClientsFunctions.forEach(func => {
		func(client)
	})
})

// Connecter le bot à Discord
client.login(process.env.DISCORD_TOKEN)