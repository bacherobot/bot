const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
var botPrefix = bacheroFunctions.config.getValue("bachero", "prefix")
var botName = bacheroFunctions.config.getValue("bachero", "botName")
var disableTextCommand = bacheroFunctions.config.getValue("bachero", "disableTextCommand")

var listCommand = []
var pages = ["<ne doit pas être accéder, signaler ce problème.>"] // Faire que le premier élément (0) soit vide, pour que la liste commence à 1

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Affiche la liste des commandes disponibles")
		.addStringOption(option => option.setName("commandname")
			.setDescription("Affiche l'utilisation d'une commande spécifique")
			.setRequired(false))
		.addNumberOption(option => option.setName("page")
			.setDescription("Permet de choisir la page affichée lorsqu'on n'entre pas de nom de commande")
			.setRequired(false)),

	// Obtenir le client
	async getClient(client){
		client.on("messageCreate", async message => {
			// Si on mentionne le bot, et que le message ne contient que ça
			if(message.mentions.has(client.user) && (message.content == `<@!${client.user.id}>` || message.content == `<@${client.user.id}>`)){
				// Vérifier si les commandes textes sont activés sur ce serveur
				if(!disableTextCommand) var isTextCommandDisabledGuild = await bacheroFunctions.database.get(bacheroFunctions.database.getDatabase("textCommandDisabledGuilds"), message.guild.id)
				else var isTextCommandDisabledGuild = true

				// Répondre
				message.reply({ embeds: [
					new EmbedBuilder()
						.setTitle("Oh c'est moi")
						.setDescription(disableTextCommand ? `${botName} ne fonctionne qu'avec des commandes slash. Tu peux commencer à écrire \`/\` et Discord complétera les commandes pour toi. Sinon, tu peux utiliser la commande \`/help\` !` : `Tu peux utiliser la commande \`/help\` pour obtenir la liste des commandes disponibles, ou l'utiliser via message classique, en envoyant \`${botPrefix}help\`${isTextCommandDisabledGuild ? ".\nNote : la fonctionnalité d'utilisation des commandes via message a été désactivé sur ce serveur par un membre du staff." : ""}`)
						.setColor(bacheroFunctions.colors.primary)
				], ephemeral: false }).catch(err => {})
			}
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Si on a pas encore la liste des modules, le définir
		if(!listCommand?.length){
			var allModulesDetails = bacheroFunctions.modules.allModulesDetails()
			allModulesDetails.forEach((mod) => {
				(mod?.commands || []).forEach((cmd) => {
					listCommand.push({ name: cmd.name, module: mod, command: cmd })
				})
			})
		}

		// Diviser la liste en plusieurs pages
		var commandsMessage = ""
		if(!pages?.[1]) listCommand.forEach(cmd => {
			if(commandsMessage.length > 3900){
				pages.push(commandsMessage)
				commandsMessage = `\n• ${cmd.name} : ${cmd.command.description.replace(/`/g, "")}`
			} else commandsMessage += `\n• ${cmd.name} : ${cmd.command.description.replace(/`/g, "")}`
		})
		if(commandsMessage) pages.push(commandsMessage)

		// Obtenir le nom de la commande
		var commandName = interaction.options.getString("commandname")

		// Si aucun nom de commande n'est donné, obtenir la liste complète
		if(!commandName){
			// Créer un embed
			var embed = new EmbedBuilder()
				.setTitle("Liste des commandes")
				.setColor(bacheroFunctions.colors.primary)

			// Si on veut choisir une page à afficher
			var currentlyShowedPage = interaction.options.getNumber("page") || 1
			if(currentlyShowedPage > pages?.length - 1) embed.setFooter({ text: "Première page affichée car la valeur que vous avez spécifiée est trop haute" })
			else if(currentlyShowedPage < 1) embed.setFooter({ text: "Première page affichée car la valeur que vous avez spécifiée est trop basse" })
			else embed.setFooter({ text: `Affichage de la page ${currentlyShowedPage}/${pages?.length - 1} • ${listCommand?.length} résultats` })

			// Ajouter la page dans l'embed
			embed.setDescription(pages[currentlyShowedPage] || pages[1] || pages[0] || pages?.join("\n") || pages) // le choix de la sécurité

			// Envoyer l'embed
			interaction.reply({ embeds: [embed] }).catch(err => {})
		}
		// Sinon, obtenir les infos sur la commande
		else {
			// Obtenir la commande et en faire un clone
			var commandBeforeClone = listCommand.find(m => m.name == (commandName?.split(" ")[0] || commandName))
			var command = commandBeforeClone ? JSON.parse(JSON.stringify(commandBeforeClone)) : null
			if(commandName?.split(" ")[1] && command?.command?.options?.find(m => m.type == 1 && m.name == commandName?.split(" ")[1])){
				var _command = command
				command = command.command.options.find(m => m.name == commandName?.split(" ")[1])
				command.command = _command
				command.module = _command.module
			}

			// Si la commande n'existe pas, répondre avec un message d'erreur
			if(!command){
				var embed = new EmbedBuilder()
					.setTitle("Commande introuvable")
					.setDescription(`Aucune commande avec le nom \`${commandName.replace(/`/g, "")}\` n'a été trouvé. Utiliser la commande d'aide sans arguments pour obtenir la liste complète.`)
					.setColor(bacheroFunctions.colors.secondary)
				return interaction.reply({ embeds: [embed] }).catch(err => {})
			}

			// Liste des sous commandes s'il y en a
			if(command?.command?.options?.length && command?.command?.options?.filter(op => op.type == 1)?.length) var subCommandsText = `\nㅤ  • ${command?.command?.options?.map(o => `${o.name} : ${o.description}`).join("\nㅤ  • ")}`
			if(subCommandsText) subCommandsText = `\n**Sous commandes** : ${subCommandsText}`

			// Faire une variable qui contiendra les indications sur les arguments
			if(command.options) command.command.options = command.options
			if(command?.command?.options?.length && interaction.sourceType == "textCommand") var argumentsText = command?.command?.options?.map(o => `${(o.required ? "<" : "[") + o.name}:${o.type?.toString()?.replace("3", "contenu").replace("4", "nombre entier").replace("5", "true/false").replace("6", "utilisateur").replace("7", "salon").replace("8", "rôle").replace("9", "utilisateur ou rôle").replace("10", "nombre").replace("11", "attachement")}${o.required ? ">" : "]"}`).join("; ")
			else if(command?.command?.options?.length) var argumentsText = `\nㅤ  • ${command?.command?.options?.map(o => o.name).join("\nㅤ  • ")}`
			if(argumentsText) argumentsText = `\n**Arguments** : ${argumentsText}`

			// Sinon, créer un embed pour afficher les infos de la commande
			var embed = new EmbedBuilder()
				.setTitle(command?.name)
				.setDescription(`${command?.module?.whitelistedGuildIds?.length && !command?.module?.whitelistedGuildIds?.includes(interaction.guildId) ? "⚠️ Non autorisé sur ce serveur\n" : ""}${(command?.command?.slashToText || command?.command?.command?.slashToText) == false ? "⚠️ Uniquement disponible pour les commandes slash\n" : ""}\n> ${(command.command.description || command.description).replace(/\n/g, "  ").replace(/`/g, "")}\n\n**Provient du module :** ${command.module.packageName}${subCommandsText || argumentsText || ""}`)
				.setColor(bacheroFunctions.colors.primary)

			// Répondre avec l'embed
			interaction.reply({ embeds: [embed] }).catch(err => {})
		}
	}
}