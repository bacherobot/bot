const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('bachero.module.databaseTest')

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('db-getall')
		.setDescription('Effectue une opération sur la BDD : getAll'),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Obtenir tout le contenu de la base de données
		var entireDatabase = await bacheroFunctions.database.getAll(database)
		entireDatabase = JSON.stringify(entireDatabase, null, 2) || entireDatabase

		// Créer un embed
		var embed = new EmbedBuilder()
		.setTitle('Opération effectuée')
		.setDescription("```\n" + (entireDatabase?.toString()?.replace(/`/g, ' `') || entireDatabase) + "\n```")
		.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
		.setFooter({text:`L'activation du module "bachero.module.databaseTest" est fortement déconseillée`})

		// Répondre à l'utilisateur
		interaction.reply({ embeds: [embed] }).catch(err => {})
	}
}