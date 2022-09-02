// Importer quelques librairies
const os = require('os')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const jsonc = require('jsonc')
const events = require('events')
const bacheroFunctions = require('./functions')
require('dotenv').config()

// Obtenir le nom du bot
var botName = bacheroFunctions.config.getValue('bachero', 'botName')

// Créé un listener pour les modules
var interactionListener = new events.EventEmitter()
var interactionListenerText = new events.EventEmitter()

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
	} catch (e) {
		return false
	}
}

// Importer et initialiser un bot Discord
const { REST } = require('@discordjs/rest')
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN)
const { Client, GatewayIntentBits, Partials, EmbedBuilder, Routes, ActivityType } = require('discord.js')
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

// Map qui contiendra les slash commands
client.commands = new Map()
client.contextsMenus = new Map()
client.allModulesDetails = new Map()

// map qui contiendra les text commands
client.textcommands = new Map()

// Obtenir la liste des modules et préparer une variable
var modulesFolder = fs.readdirSync(path.join(__dirname, 'modules'))
var allModules = []
var allSlashCommands = []

// Charger et vérifier tout les modules
function loadModules(){
	for (var module of modulesFolder){
		// Lire le fichier manifest.jsonc
		var manifest
		try {
			manifest = jsonc.parse(fs.readFileSync(path.join(__dirname, 'modules', module, 'manifest.jsonc'), 'utf8'))
		} catch (e) {
			manifest = null
		}

		// Préparer la liste des erreurs du module
		var errors = []

		// Si le fichier manifeste n'existe même pas
		if(!manifest) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : le fichier manifest.jsonc n'existe pas ou est invalide.`)

		// Si le fichier est désactivé, passer au prochain
		if(manifest?.disabled) continue

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

		// Vérifier que les ficheirs existent
		for(var file of manifest?.files || []){
			if(!fs.existsSync(path.join(__dirname, 'modules', module, file))) errors.push(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : le fichier ${chalk.yellow(file)} n'existe pas.`)
		}

		// Si il y a des erreurs
		if(errors.length > 0){
			console.log(errors.join('\n'))
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
			if(!fs.existsSync(path.join(__dirname, 'config', `${module}.jsonc`))) fs.writeFileSync(path.join(__dirname, 'config', `${module}.jsonc`), JSON.stringify(config, null, 4))
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
			var editedfile = require(textcommandcompatibility(path.join(__dirname, 'modules', module, fileName)));

			// En profiter pour donner au module le listener
			if(file?.interactionListener) file.interactionListener(interactionListener);

			// pour les text commands
			if(editedfile?.interactionListenerText) editedfile.interactionListenerText(interactionListenerText);

			// Si il y a des commandes slash
			if(file?.slashInfo && file?.execute){
				if(allSlashCommands.find(slashCommand => slashCommand.name == file.slashInfo.name)){
					console.log(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : une commande slash avec le même nom existe déjà.`)
					return process.exit()
				}
				client.commands.set(file.slashInfo.toJSON().name, { file: file, whitelistedGuildIds: manifest.whitelistedGuildIds })
				client.textcommands.set(editedfile.slashInfo.toJSON().name, { file: editedfile, whitelistedGuildIds: manifest.whitelistedGuildIds })
				allSlashCommands.push(file.slashInfo.toJSON())
				thisModuleAllCommands.push(file.slashInfo.toJSON())
			}

			// Si il y a des menus contextuel
			if(file?.contextInfo && file?.execute){
				if(thisModuleAllContextsMenu.find(slashCommand => slashCommand.name == file.contextInfo.name)){
					console.log(chalk.red("[ERROR] ") + `Impossible de charger le module ${chalk.yellow(module)} : un menu cotnextuel avec le même nom existe déjà.`)
					return process.exit()
				}
				client.contextsMenus.set(file.contextInfo.toJSON().name, { file: file, whitelistedGuildIds: manifest.whitelistedGuildIds })
				allSlashCommands.push(file.contextInfo.toJSON()) // oui je met ça dans la variable des cmd slash, ça marche donc go
				thisModuleAllContextsMenu.push(file.contextInfo.toJSON())
			}
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
			whitelistedGuildIds: manifest.whitelistedGuildIds
		})

		// Afficher le message une fois démarré
		console.log(chalk.green("[OK] ") + `Module ${chalk.yellow(manifest.packageName)} chargé${manifest?.onloadMessage ? ` (${manifest?.onloadMessage})` : ''}.`)

		// Si c'était le dernier module de la liste
		if(module == modulesFolder[modulesFolder.length - 1]) createCommands()
	}
}; loadModules()

// Crée les commandes
async function createCommands(){
	try {
		console.log(chalk.blue("[INFO] ") + 'Actualisation des commandes slashs commencées...')
		await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: allSlashCommands })
		console.log(chalk.blue("[INFO] ") + 'Actualisation des commandes slashs terminées')
	} catch (error) {
		console.log(chalk.red("[ERROR] ") + "Impossible d'actualiser les commandes slashs.")
		console.error(error)
	}
}

// Quand on reçoit une interaction
client.on('interactionCreate', async interaction => {
	// Si c'est un bouton ou un modal, l'envoyer via le listener
	if(interaction.isModalSubmit()) {
		if(interaction.customId.startsWith('text:')) {
			return interactionListenerText.emit('modal', interaction);
		} else {
			return interactionListener.emit('modal', interaction);
		}
	}
	if(interaction.isButton()) {
		// verifie si c'est une commande text ou slash
		if(interaction.customId.startsWith('text:')) {
			return interactionListenerText.emit('button', interaction)
		} else {
			return interactionListener.emit('button', interaction)
		}
	}

	// Si c'est un menu contextuel
	if(interaction.isUserContextMenuCommand()){
		// Récupérer le menu par son nom
		var contextMenu = client.contextsMenus.get(interaction.commandName)

		// Si aucune résultat
		if(!contextMenu){
			console.log(chalk.yellow("[WARN] ") + `${interaction.user.tag} a exécuté le menu contextuel ${chalk.yellow(interaction.commandName)} qui n'existe pas.`)
			return await interaction.reply({ embeds: [new EmbedBuilder().setTitle("Menu contextuel inexistant").setDescription(`Ce menu contextuel est introuvable dans ${botName}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false })
		}

		// Exécuter la commande
		try {
			await contextMenu.file.execute(interaction)
		} catch (error) {
			console.log(chalk.yellow("[WARN] ") + `${interaction.user.tag} a exécuté le menu contextuel ${chalk.yellow(interaction.commandName)} qui a fini en une erreur :`)
			console.log(error)
			try {
				interaction.reply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution du menu contextuel :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false }).catch(err => {})
			} catch (error) {
				await interaction.editReply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution du menu contextuel :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false }).catch(err => {})
			}
		}
	}

	// Et si c'est une commande slash
	else if(interaction.isCommand()){
		console.log(chalk.blue("[INFO] ") + `Commande reçue : ${interaction.commandName} (${interaction.id})`)
		// Récupérer la commande par son nom
		var command = client.commands.get(interaction.commandName)

		// Si aucune commande trouvé
		if(!command){
			console.log(chalk.yellow("[WARN] ") + `${interaction.user.tag} a exécuté la commande ${chalk.yellow(interaction.commandName)} qui n'existe pas.`)
			return await interaction.reply({ embeds: [new EmbedBuilder().setTitle("Commande inexistante").setDescription(`Cette commande est introuvable dans ${botName}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false })
		}

		// Vérifier qu'on est sur un serveur autorisé
		if(command?.whitelistedGuildIds?.length && !command.whitelistedGuildIds.includes(interaction.guildId)){
			return await interaction.reply({ embeds: [new EmbedBuilder().setTitle("Serveur interdit").setDescription(`Cette commande ne peut pas être exécuté puisque ce serveur n'est pas autorisé.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))], ephemeral: true })
		}

		// Exécuter la commande
		try {
			await command.file.execute(interaction)
		} catch (error) {
			console.log(chalk.yellow("[WARN] ") + `${interaction.user.tag} a exécuté la commande ${chalk.yellow(interaction.commandName)} qui a fini en une erreur :`)
			console.log(error)
			try {
				interaction.reply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false }).catch(err => {})
			} catch (error) {
				await interaction.editReply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})], ephemeral: false }).catch(err => {})
			}
		}
	}
})

// Quand le bot reçoit un message
client.on('messageCreate', async message => {
	// Répondre à ElWatch
	if(message.content === "Hello from ElWatch!" && message.author.bot && message.author.id === "898255769827430460") return message.reply("coucou bg :eye:")

	// Empêcher les bots
	if(message.author.bot) return

	// Uniquement si c'est le bon prefix
	if(!message.content.startsWith(bacheroFunctions.config.getValue('bachero', 'prefix'))) return

	// Si c'est une commande sous forme de message
	var args = message.content?.split(bacheroFunctions.config.getValue('bachero', 'prefix'))?.[1]?.trim()?.split(' ')
	var commandName = args?.[0]?.toLowerCase(); // on peut pas faire de commande slash avec majuscules
	args = args?.slice(1)

	// Vérifier si la commande existe sous forme de commande slash
	var command = client.textcommands.get(commandName)
	// Si aucune commande trouvé
	if(!command){
		console.log(chalk.yellow("[WARN] ") + `${message.author.tag} a exécuté la commande ${chalk.yellow(commandName)} qui n'existe pas.`)
		return await message.reply({ embeds: [new EmbedBuilder().setTitle("Commande inexistante").setDescription(`Cette commande est introuvable dans ${botName}.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})] })
	}

	// Vérifier qu'on est sur un serveur autorisé
	if(command?.whitelistedGuildIds?.length && !command.whitelistedGuildIds.includes(message.guildId)){
		return await message.reply({ embeds: [new EmbedBuilder().setTitle("Serveur interdit").setDescription(`Cette commande ne peut pas être exécuté puisque ce serveur n'est pas autorisé.`).setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))] })
	}

	// Préparer la variable qui contiendra le message de réponse
	var messageResponse;

	// Modifier le message pour qu'il ressemble un peu plus à une interaction
	message.user = message.author
	delete message.author
	message.deferReply = async () => {
		messageResponse = await message.reply('Veuillez patienter...')
		return messageResponse
	}
	message.editReply = async (content) => {
		// check if messageResponse is editable
		if(messageResponse?.editable) {
			// if new content dont have new content remove "Veuillez patienter..." from messageResponse with an invisible character
			if(!content?.content) content.content = "​";
			// edit messageResponse
			await messageResponse.edit(content);
		} else {
			// check if messageResponse is removable
			if(messageResponse?.deletable) {
				await messageResponse.delete();
			}
			messageResponse = await message.reply(content);
		}
	}

	message.options = {};
	function getargs(parametername) {
		// get arguments from message content
		var arguments = message.content.replace(bacheroFunctions.config.getValue('bachero', 'prefix') + ' ', '');
		// check if prefix is still in arguments
		if(arguments.startsWith(bacheroFunctions.config.getValue('bachero', 'prefix'))) {
			arguments = arguments.replace(bacheroFunctions.config.getValue('bachero', 'prefix'), '');
		}
		// remove command name from arguments
		arguments = arguments.replace(commandName + ' ', '');
		// check if arguments start with commandName
		if(arguments.startsWith(commandName)) {
			arguments = arguments.replace(commandName, '');
		}
		// divide arguments by comma
		if(arguments.includes(',')) {
			if(arguments.includes(', ')) {
				arguments = arguments.split(', ');
			} else {
				arguments = arguments.split(',');
			}
			// split each argument by : and check if the first part is the parametername
			for(var i = 0; i < arguments.length; i++) {
				if(arguments[i].includes(': ')) {
					argument = arguments[i].split(': ');
				} else {
					argument = arguments[i].split(':');
				}
				if(argument[0] === parametername) {
					return argument[1];
				}
			}
		} else {
			// split arguments by : and check if the first part is the parametername
			var argument;
			if(arguments.includes(': ')) {
				argument = arguments.split(': ');
			} else {
				argument = arguments.split(':');
			}
			if(argument[0] === parametername) {
				return argument[1];
			}
		}
		// return null if no argument with the parametername was found
		return null;
	}
		
	message.options.getString = (parametername) => {
		return getargs(parametername);
	}
	message.options.getBoolean = (parametername) => {
		var argument = getargs(parametername);
		if(argument === 'true') {
			return true
		} else if(argument === 'false') {
			return false
		} else {
			return null
		}
	}
	message.options.getUser = (parametername) => {
		var argument = getargs(parametername)
		if(argument) {
			// get member or role from mention
			var mention = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '');
			// remove all but numbers
			mention = mention.replace(/[^0-9]/g, '');
			// get member, channel or role from id
			var member = message.guild.members.cache.get(mention);
			// get user from member
			return member.user;
		} else {
			return null
		}
	}
	message.options.getMember = (parametername) => {
		var argument = getargs(parametername)
		if(argument) {
			// get member or role from mention
			var mention = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '');
			// remove all but numbers
			mention = mention.replace(/[^0-9]/g, '');
			// get member, channel or role from id
			var member = message.guild.members.cache.get(mention);
			return member;
		} else {
			return null
		}
	}
	message.options.getChannel = (parametername) => {
		var argument = getargs(parametername)
		if(argument) {
			// get member or role from mention
			var mention = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '');
			// remove all but numbers
			mention = mention.replace(/[^0-9]/g, '');
			// get member, channel or role from id
			var channel = message.guild.channels.cache.get(mention);
			return channel;
		} else {
			return null
		}
	}
	message.options.getRole = (parametername) => {
		var argument = getargs(parametername)
		if(argument) {
			// get member or role from mention
			var mention = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '');
			// remove all but numbers
			mention = mention.replace(/[^0-9]/g, '');
			// get member, channel or role from id
			var role = message.guild.roles.cache.get(mention);
			return role;
		} else {
			return null
		}
	}
	message.options.getInteger = (parametername) => {
		var argument = getargs(parametername)
		if(argument) {
			return parseInt(argument);
		} else {
			return null
		}
	}
	message.options.getNumber = (parametername) => {
		var argument = getargs(parametername)
		if(argument) {
			return parseFloat(argument);
		} else {
			return null
		}
	}
	message.options.getMentionable = (parametername) => {
		var argument = getargs(parametername)
		if(argument) {
			// get member or role from mention
			var mention = argument.replace('<', '').replace('>', '').replace('@', '').replace('!', '').replace('&', '').replace('#', '').replace(' ', '');
			// remove all but numbers
			mention = mention.replace(/[^0-9]/g, '');
			// get member, channel or role from id
			var member = message.guild.members.cache.get(mention);
			var role = message.guild.roles.cache.get(mention);
			var channel = message.guild.channels.cache.get(mention);
			if(member) {
				return member;
			}
			if(role) {
				return role;
			}
			if(channel) {
				return channel;
			}
			return null;
		} else {
			return null
		}
	}
	message.options.getAttachment = (parametername) => {
		// get attachment from message
		var attachment = message.attachments.array()[0];
		return attachment;
	}

	message.isSlash = false;

	// Exécuter la commande
	try {
		await command.file.execute(message)
	} catch (error) {
		console.log(chalk.yellow("[WARN] ") + `${message.user.tag} a exécuté la commande ${chalk.yellow(command)} qui a fini en une erreur :`)
		console.log(error)
		try {
			messageResponse = message.reply({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})] }).catch(err => {})
		} catch (error) {
			await messageResponse.edit({ embeds: [new EmbedBuilder().setTitle("Une erreur est survenue").setDescription("Un problème est survenu lors de l'exécution de la commande :\n```\n" + (error?.toString()?.replace(/`/g, ' `') || error) + "\n```").setColor(bacheroFunctions.config.getValue('bachero', 'embedColor')).setFooter({text:`N'hésitez pas à signaler ce problème au staff de ${botName} !`})] }).catch(err => {})
		}
	}
})

function textcommandcompatibility(filename) {
	// read file
	var file = fs.readFileSync(filename, 'utf8');
	// add compatibility with text commands
	file = file.replaceAll('../../', `${__dirname.replaceAll('\\', '\\\\')}\\\\`);
	file = file.replaceAll('interaction?.message?.interaction', 'interaction.message.interaction');
	file = file.replaceAll('interaction.message.interaction', 'interaction?.message');
	// replied to message
	file = file.replaceAll('interaction?.message?.user', '(await interaction?.message?.channel?.messages.fetch(interaction?.message?.reference?.messageId))?.author');
	file = file.replaceAll(`customId != '`, `customId != '`);
	file = file.replaceAll(`customId == '`, `customId == '`);
	file = file.replaceAll(`customId != '`, `customId != 'text:`);
	file = file.replaceAll(`customId == '`, `customId == 'text:`);
	file = file.replaceAll('customId == `', 'customId == `text:');
	file = file.replaceAll('customId != `', 'customId != `text:');
	file = file.replaceAll('interactionListener', 'interactionListenerText');
	file = file.replaceAll('.setCustomId(`', '.setCustomId(`text:');
	// create temp folder in case it doesn't exist
	fs.mkdirSync(path.join(__dirname, 'TEMP', 'bachero_textcommandcompatibility', `${path.join(filename.replace(__dirname, ''), '..')}`), { recursive: true })
	// save
	fs.writeFileSync(path.join(__dirname, 'TEMP', 'bachero_textcommandcompatibility', `${filename.replace(__dirname, '')}`), file);
	return path.join(__dirname, 'TEMP', 'bachero_textcommandcompatibility', `${filename.replace(__dirname, '')}`);
}

// Une fois connecté à Discord
client.on('ready', () => {
	// Afficher un message dans la console
	console.log(chalk.blue("[INFO] ") + `Connecté à Discord en tant que ${chalk.yellow(client.user.tag)}`)

	// Définir le bot dans la fonction
	bacheroFunctions.botClient._set(client)

	// Changer le statut
	var botActivityContent = bacheroFunctions.config.getValue('bachero', 'botActivityContent')
	var botActivityType = bacheroFunctions.config.getValue('bachero', 'botActivityType')
	botActivityType = {
		'playing': ActivityType.Playing,
		'streaming': ActivityType.Streaming,
		'watching': ActivityType.Watching,
		'listening': ActivityType.Listening,
		'competing': ActivityType.Competing
	}[botActivityType?.toLowerCase() || 'playing']
	if(botActivityContent?.length) client.user.setPresence({ activities: [{ name: botActivityContent, type: botActivityType }], status: (bacheroFunctions.config.getValue('bachero', 'botStatus') || 'online') })
})

// Connecter le bot à Discord
client.login(process.env.DISCORD_TOKEN)