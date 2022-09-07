const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')
const authorizedIds = bacheroFunctions.config.getValue('bachero.module.moduleInfo', 'authorizedIds')
var allModulesDetails

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('module')
		.setDescription('Affiche la liste des modules')
		.addStringOption(option => option.setName('packagename')
			.setDescription('Affiche des informations sur un module en particulier')
			.setRequired(false)),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Vérifier que la personne est autorisé
		if(authorizedIds?.length && !authorizedIds?.includes(interaction.user.id)) return interaction.reply({ ephemeral: true, content: "Oupsi, tu n'as pas le droit d'utiliser cette commande..." })

		// Si on a pas encore la liste des modules, le définir
		if(!allModulesDetails) allModulesDetails = bacheroFunctions.modules.allModulesDetails()

		// Obtenir le nom de packet
		var packageName = interaction.options.getString('packagename')

		// Obtenir la liste des modules
		var modules = Object.values(Object.fromEntries(allModulesDetails))

		// Si aucun nom de packet n'est donné, obtenir la liste des modules
		if(!packageName){
			// TODO: créé un hastebin si la liste est trop longue et dépasse la limite de caractères
			// Créér un embed pour afficher la liste des modules
			var embed = new EmbedBuilder()
			.setTitle('Liste des modules')
			.setDescription(`${modules.length} modules ont été trouvés :\n\n• ${modules.map(m => '*' + m.packageName + '* : ' + m.shortDescription.replace(/`/g, "`" + String.fromCharCode(8203))).join('\n• ')}`.substring(0, 4000))
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))

			// Répondre avec l'embed
			interaction.reply({ embeds: [embed] }).catch(err => {})
		}
		// Sinon, obtenir les infos sur le module
		else {
			// Obtenir le module
			var module = modules.find(m => m.packageName == packageName)

			// Si le module n'existe pas, répondre avec un message d'erreur
			if(!module){
				var embed = new EmbedBuilder()
				.setTitle('Module introuvable')
				.setDescription(`Aucun module avec le nom \`${packageName.replace(/`/g, "`" + String.fromCharCode(8203))}\` n'a été trouvé. Utiliser la commande sans arguments pour obtenir la liste complète.`)
				.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
				return interaction.reply({ embeds: [embed] }).catch(err => {})
			}

			// Sinon, créer un embed pour afficher les infos du module
			var embed = new EmbedBuilder()
			.setTitle(module.name)
			.setDescription(`> ${module.shortDescription.replace(/\n/g, '  ').replace(/`/g, "`" + String.fromCharCode(8203))}\n\n**Nom de packet :** ${module.packageName}\n**Auteur${module.authors.length > 1 ? 's' : ''} :** ${module.authors.join(', ')}\n**Commande${module.commands.length > 1 ? 's' : ''} :** ${(module?.commands?.length > 0 ? module.commands : [{name:'Aucune'}]).map(c => c.name).join(', ')}`)
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
			if(module.source && typeof module.source == 'string') embed.setURL(module.source)

			// Répondre avec l'embed
			interaction.reply({ embeds: [embed] }).catch(err => {})
		}
	}
}