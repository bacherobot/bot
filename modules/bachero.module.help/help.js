const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js')
const bacheroFunctions = require('../../functions')
var botName = bacheroFunctions.config.getValue('bachero', 'botName')
var listCommand = new Map()

module.exports = {
	// Propriétés additionnelles à la commande
	disableSlashToText: true,

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
			allModulesDetails.forEach((mod,i) => {
				(mod?.commands || []).forEach((cmd,j) => {
					listCommand.set(cmd.name, { module: mod, command: cmd })
				})
			})
		}
		console.log(listCommand)
// https://www.npmjs.com/package/discordjs-button-embed-pagination
		// Obtenir le nom de la commande
		var commandname = interaction.options.getString('commandname')

		// Obtenir la liste des modules
		var modules = Object.values(Object.fromEntries(allModulesDetails))
	}
}