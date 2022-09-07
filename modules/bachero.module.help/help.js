const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')
var listCommand = []

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('help')
		.setDescription(`Affiche la liste des commandes disponibles`)
		.addStringOption(option => option.setName('commandname')
			.setDescription("Affiche l'utilisation d'une commande ")
			.setRequired(false)),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Si on a pas encore la liste des modules, le définir
		if(!listCommand?.size){
			var allModulesDetails = bacheroFunctions.modules.allModulesDetails()
			allModulesDetails.forEach((mod) => {
				(mod?.commands || []).forEach((cmd) => {
					listCommand.push({ name: cmd.name, module: mod, command: cmd })
				})
			})
		}

		// Obtenir le nom de la commande
		var commandName = interaction.options.getString('commandname')

		// Si aucun nom de commande n'est donné, obtenir la liste complète
		if(!commandName){
			// TODO: trouver un moyen pour afficher l'embed même quand on a trop de trucs à afficher
			var embed = new EmbedBuilder()
			.setTitle('Liste des commandes')
			.setDescription(`${listCommand.length} commandes ont été trouvés :\n\n• ${listCommand.map(m => m.name + ' : ' + m.command.description.replace(/`/g, "`" + String.fromCharCode(8203))).join('\n• ')}`.substring(0, 4000))
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
			interaction.reply({ embeds: [embed] }).catch(err => {})
		}
		// Sinon, obtenir les infos sur la commande
		else {
			// Obtenir la commande
			var command = listCommand.find(m => m.name == commandName)

			// Si la commande n'existe pas, répondre avec un message d'erreur
			if(!command){
				var embed = new EmbedBuilder()
				.setTitle('Commande introuvable')
				.setDescription(`Aucune commande avec le nom \`${commandName.replace(/`/g, "`" + String.fromCharCode(8203))}\` n'a été trouvé. Utiliser la commande d'aide sans arguments pour obtenir la liste complète.`)
				.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
				return interaction.reply({ embeds: [embed] }).catch(err => {})
			}

			// Faire une variable qui contiendra les indications sur les arguments
			if(command?.command?.options?.length && interaction.sourceType == 'textCommand') var argumentsText = command?.command?.options?.map(o => (o.required ? '<' : '[') + o.name + ':' + o.type?.toString()?.replace('3', 'contenu').replace('4', 'nombre entier').replace('5', 'true/false').replace('6', 'utilisateur').replace('7', 'salon').replace('8', 'rôle').replace('9', 'utilisateur ou rôle').replace('10', 'nombre').replace('11', 'attachement') + (o.required ? '>' : ']')).join('; ')
			else if(command?.command?.options?.length) var argumentsText = `\nㅤ  • ${command?.command?.options?.map(o => o.name).join('\nㅤ  • ')}`
			if(argumentsText) argumentsText = `\n**Arguments** : ${argumentsText}`

			// Sinon, créer un embed pour afficher les infos de la commande
			var embed = new EmbedBuilder()
			.setTitle(command.name)
			.setDescription(`${command?.module?.whitelistedGuildIds?.length && !command?.module?.whitelistedGuildIds?.includes(interaction.guildId) ? '⚠️ Non autorisé sur ce serveur\n' : ''}${command?.command?.slashToText == false ? '⚠️ Uniquement disponible pour les commandes slash\n' : ''}\n> ${command.command.description.replace(/\n/g, '  ').replace(/`/g, "`" + String.fromCharCode(8203))}\n\n**Provient du module :** ${command.module.packageName}${argumentsText}`)
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))

			// Répondre avec l'embed
			interaction.reply({ embeds: [embed] }).catch(err => {})
		}
	}
}