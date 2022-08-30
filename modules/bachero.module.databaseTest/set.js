const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('bachero.module.databaseTest')

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('db-set')
		.setDescription('Effectue une opération sur la BDD : set')
		.addStringOption(option => option.setName('property')
			.setDescription('Propriété')
			.setRequired(true))
		.addStringOption(option => option.setName('value')
			.setDescription('Valeur')
			.setRequired(true)),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Obtenir les arguments
		var property = interaction.options.getString('property')
		var value = interaction.options.getString('value')
		try {
			value = JSON.parse(value)
		} catch (err) {}

		// Définir dans la BDD
		var databaseChange = await bacheroFunctions.database.set(database, property, value)

		// Créer un embed
		var embed = new EmbedBuilder()
		.setTitle('Opération effectuée')
		.setDescription("```\n" + (databaseChange?.toString()?.replace(/`/g, ' `') || databaseChange) + "\n```")
		.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
		.setFooter({text:`L'activation du module "bachero.module.databaseTest" est fortement déconseillée`})

		// Répondre à l'utilisateur
		interaction.reply({ embeds: [embed] }).catch(err => {})
	}
}