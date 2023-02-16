const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const bacheroFunctions = require('../../functions')
const Genius = require("genius-lyrics"); const GeniusClient = new Genius.Client();

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('lyrics')
		.setDescription('Recherche et obtient les paroles d\'une chanson')
		.addStringOption(option => option.setName('search')
			.setDescription("Terme de recherche")
			.setRequired(true)
		),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return 'stop' }) == 'stop') return

		// Obtenir le terme de recherche, et en faire une recherche
		var searchResult = await GeniusClient.songs.search(interaction.options.getString('search'))
		if(!searchResult?.length) return interaction.editReply({ content: "Aucun résultat n'a pu être trouvé pour ce terme de résultat." })
		searchResult = searchResult[0]

		// Obtenir les paroles
		var lyrics = await searchResult.lyrics()
		if(!lyrics) return interaction.editReply({ content: "Aucune paroles n'a pu être trouvé pour ce terme de résultat." })

		// Créer l'embed
		var embed = new EmbedBuilder()
		.setTitle(searchResult.fullTitle)
		.setDescription(lyrics.substring(0, 4092).length < lyrics.length ? lyrics.substring(0, 4092) + '...' : lyrics)
		.setThumbnail(searchResult.thumbnail)
		.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
		.setFooter({ text: `Paroles récupérées via Genius sous la demande de ${interaction.user.tag}` })

		// Créer un bouton
		var row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
			.setURL(searchResult.url)
			.setStyle(ButtonStyle.Link)
			.setLabel(`Voir ${lyrics.substring(0, 4092).length < lyrics.length ? 'en entier' : ''} sur Genius`)
		)

		// Envoyer l'embed
		interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}