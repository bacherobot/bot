const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.databaseTest")

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("db-has")
		.setDescription("Effectue une opération sur la BDD : has")
		.addStringOption(option => option.setName("property")
			.setDescription("Propriété")
			.setRequired(true)),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Obtenir la propriété
		var property = interaction.options.getString("property")
		property = await bacheroFunctions.database.has(database, property)

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle("Opération effectuée")
			.setDescription(`\`\`\`\n${property?.toString()?.replace(/`/g, " `") || property}\n\`\`\``)
			.setColor(bacheroFunctions.colors.primary)
			.setFooter({ text: "L'activation du module \"bachero.module.databaseTest\" est fortement déconseillée" })

		// Répondre à l'utilisateur
		interaction.reply({ embeds: [embed] }).catch(err => {})
	}
}