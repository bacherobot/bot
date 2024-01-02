const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const Genius = require("genius-lyrics"); const GeniusClient = new Genius.Client()
const escape = require("markdown-escape")

// Cache
var cache
if(global.lyricsCache) cache = global.lyricsCache
else {
	const NodeCache = require("node-cache")
	cache = new NodeCache()
	global.lyricsCache = cache
}

// Fonction pour tenter de "compresser" un texte tout en le gardant lisible pour un humain
function compressText(text){
	// Remplacer certains caractères par d'autres
	text = text.replace(/\.\.\./g, "…")
	text = text.replace(/\.\./g, "‥")
	text = text.replace(/!!/g, "‼")
	text = text.replace(/\?\?/g, "⁇")
	text = text.replace(/!\?/g, "⁈")
	text = text.replace(/\?!/g, "⁉")
	text = text.replace(/--/g, "—")
	text = text.replace(/---/g, "——")
	text = text.replace(/----/g, "———")
	text = text.replace(/-----/g, "———")

	// Enlever les indications de paroles (toute les lignes qui commencent par un [ et fini par un ])
	text = text.replace(/\[.*\]/g, "")

	// Enlever les doubles sauts de ligne
	text = text.replace(/\n\n/g, "\n")

	// Retourner le texte
	return escape(text.trim())
}

// Fonction pour chercher les paroles en fonction d'un terme de recherche
async function search(query){
	// On vérifie le cache
	if(cache.has(query)) return cache.get(query)

	// Faire une recherche sur Genius
	var searchResult = await GeniusClient.songs.search(query).catch(err => {})
	if(!searchResult?.length) return null
	searchResult = searchResult.filter(r => r?.artist?.name != "Genius English Translations" && !r?.instrumental && !r?.fullTitle?.includes(" (Instrumental)"))
	searchResult = searchResult?.[0]
	if(!searchResult) return null

	// Obtenir les paroles
	var lyrics = await searchResult.lyrics().catch(err => {})
	if(!lyrics) return null
	lyrics = compressText(lyrics)

	// Enregistrer et retourner les infos
	var toSave = { lyrics, fullTitle: searchResult.fullTitle, url: searchResult.url }
	cache.set(query, toSave)
	return toSave
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("lyrics")
		.setDescription("Recherche et obtient les paroles d'une chanson")
		.addStringOption(option => option.setName("search")
			.setDescription("Terme de recherche")
			.setRequired(false)),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir le terme de recherche
		var query = interaction.options.getString("search")
		var artist
		var title

		// Si on a pas de terme de recherche, on va chercher ce que l'utilisateur est en train d'écouter
		if(!query && interaction.member?.presence?.activities?.length){
			var listening = interaction.member?.presence?.activities.find(a => a.type == 2 && a?.details?.length && a?.state?.length)
			if(listening){
				artist = listening.state?.includes(";") ? listening.state?.split(";")[0] : listening.state
				title = listening.details.split("(")[0].split("[")[0].split("-")[0].trim()
				query = `${artist} ${title}`
			}
		}

		// Si on a toujours pas de terme de recherche, on affiche une erreur
		if(!query) return interaction.editReply("Pour utiliser cette commande, vous devez inclure l'argument `search` dans votre commande, ou disposez d'un statut d'écoute sur votre profil Discord (ne fonctionne que sur un serveur).").catch(err => {})

		// Faire une recherche sur Genius
		var infos = await search(query)
		if(!infos && artist && title) infos = await search(`${title} ${artist}`)
		if(!infos && title) infos = await search(`${title}`)
		if(!infos) return interaction.editReply("Aucun résultat n'a pu être trouvé pour ce terme de résultat.").catch(err => {})

		// Créer l'embed
		var embed = new EmbedBuilder()
			.setTitle(infos.fullTitle)
			.setDescription(infos.lyrics.substring(0, 4094).length < infos.lyrics.length ? `${infos.lyrics.substring(0, 4094)}…` : infos.lyrics)
			.setColor(bacheroFunctions.colors.primary)
			.setFooter({ text: `Paroles récupérées via Genius sous la demande de ${interaction.user.discriminator == "0" ? interaction.user.username : interaction.user.tag}` })

		// Créer un bouton
		var row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setURL(infos.url)
			.setStyle(ButtonStyle.Link)
			.setLabel(`Voir ${infos.lyrics.substring(0, 4092).length < infos.lyrics.length ? "en entier " : ""}sur Genius`))

		// Envoyer l'embed
		interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}