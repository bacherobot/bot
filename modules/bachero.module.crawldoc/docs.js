const { SlashCommandBuilder, EmbedBuilder, escapeMarkdown } = require("discord.js")
const bacheroFunctions = require("../../functions")
const fetch = require("node-fetch")

// Cache
var cache
if(global.crawldocCache) cache = global.crawldocCache
else {
	const NodeCache = require("node-cache")
	cache = new NodeCache()
	global.crawldocCache = cache
}

// Fonction pour obtenir le domaine d'une URL
function getDomain(url){
	if(!url?.startsWith("http://") && !url?.startsWith("https://")) url = `https://${url}`
	return new URL(url).hostname
}

// Fonction pour obtenir des infos sur le service
async function getServiceInfo(){
	// Obtenir les infos
	bacheroFunctions.showDebug("Obtention des informations sur le service CrawlDoc")
	var infos = await fetch("https://crawldoc-api.johanstick.fr/", { headers: { "User-Agent": "BacheroBot (+https://github.com/bacherobot/bot)" } }).then(res => res.json()).catch(err => { return {} })
	if(!infos?.compatibleSites) return { error: true, message: infos?.message || infos?.error || "Impossible d'obtenir les informations sur le service CrawlDoc" }

	// Enregistrer les informations
	bacheroFunctions.showDebug("Enregistrement des informations sur le service dans le cache")
	cache.set("compatibleSites", infos.compatibleSites, 60 * 60 * 24 * 7)
	cache.set("languages", infos.languages, 60 * 60 * 24 * 7)
	return infos
}

// Fonction pour simplifier un string
function simplifyString(str = ""){
	// Remplacer les accents par des lettres sans accents
	str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

	// On enlève certains éléments
	str = str.toLowerCase().replaceAll("-", "").replaceAll("_", "").replace(/[\t\r\n\s.*?!,:;/§^$%¨£#\\]/g, "").trim()

	// On retourne le string simplifié
	return str
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("docs")
		.setDescription("Lance une recherche dans une documentation")
		.addStringOption(option => option.setName("site")
			.setDescription("Nom, domaine ou identifiant du site à rechercher")
			.setRequired(true))
		.addStringOption(option => option.setName("query")
			.setDescription("Terme de recherche")
			.setRequired(true))
		.addStringOption(option => option.setName("lang")
			.setDescription("Langage de la page à rechercher")
			.setRequired(false)
			.addChoices(
				{ name: "Français", value: "fr" },
				{ name: "Anglais", value: "en" }
			)),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir la liste des sites compatibles depuis le cache
		var compatibleSites = cache.get("compatibleSites")
		if(!compatibleSites){
			compatibleSites = await getServiceInfo()
			if(compatibleSites?.error) return await bacheroFunctions.report.createAndReply("requête vers l'API de Crawldoc", compatibleSites?.message || compatibleSites?.error || compatibleSites, {}, interaction)
			compatibleSites = compatibleSites?.compatibleSites
		}

		// Obtenir le site sur lequel on va chercher
		var siteQuery = interaction.options.getString("site")
		bacheroFunctions.showDebug(`Recherche du site ${siteQuery} dans la liste des sites compatibles`)
		var site = compatibleSites.find(s => simplifyString(s.name) == simplifyString(siteQuery) || simplifyString(s.domain) == simplifyString(siteQuery) || simplifyString(s.id) == simplifyString(siteQuery) || s.alias.find(a => simplifyString(a) == simplifyString(siteQuery)))
		if(!site) return interaction.editReply({ embeds: [new EmbedBuilder().setTitle("Site introuvable").setDescription(`Aucun site n'a pu être trouvé via le nom que vous avez entré comme paramètre. Liste des sites compatibles :\n\n${compatibleSites.map(s => `• ${s.name} ([${s.domain}](https://${s.domain}))`).join("\n")}`).setColor(bacheroFunctions.colors.danger)] }).catch(err => {})

		// Obtenir le terme de recherche
		var query = interaction.options.getString("query")

		// Effectuer une recherche
		bacheroFunctions.showDebug("Requête pour obtenir les résultats de recherche")
		var searchResults = await fetch("https://crawldoc-api.johanstick.fr/search", { method: "POST", body: JSON.stringify({
			query,
			sites: [site.id],
			limit: 6,
			languageCode: interaction.options.getString("lang"),
			toReturn: ["title", "resultScore", "tags", "lastUpdated", "lang", "source"]
		}), headers: { "User-Agent": "BacheroBot (+https://github.com/bacherobot/bot)", "Content-Type": "application/json" } }).then(res => res.json()).catch(err => { return { error: true, message: err } })

		// Si on a une erreur
		bacheroFunctions.showDebug(searchResults)
		if(searchResults?.error || searchResults?.message) return await bacheroFunctions.report.createAndReply("requête vers l'API de CrawlDoc", searchResults?.message || searchResults?.error || searchResults, { query, siteId: site.id, languageCode: interaction.options.getString("lang") }, interaction)
		if(!searchResults?.length) return interaction.editReply({ embeds: [new EmbedBuilder().setTitle("Résultats de recherche").setDescription("Aucun résultat n'a pu être trouvé. Essayez d'ajuster les paramètres tels que la langue ou le site, ou essayez de simplifier votre recherche.").setColor(bacheroFunctions.colors.danger)] }).catch(err => {})

		// Créer l'embed
		var embed = new EmbedBuilder()
			.setTitle("Résultats de recherche")
			.addFields(searchResults.map(result => {
				return {
					name: `${result.tags?.length ? `${result.tags.join(", ").replace("exact-subtitle", "Sous-titre exacte").replace("exact-title", "Titre exacte")} | ` : ""}${result.source.tree.join(" → ")}`,
					value: `${result?.source?.content?.length ? `${result?.source?.content?.map(co => escapeMarkdown(co))?.join("\n").slice(0, 360)}..\n\n` : ""}* En ${result?.lang?.name} à partir de [${getDomain(result.url || result?.source?.href)}](${result?.source?.href || result.url})\n- Score : ${result.resultScore} - Dernire vérif. : <t:${Math.floor(new Date(result.lastUpdated).getTime() / 1000)}:f>`,
				}
			}))
			.setColor(bacheroFunctions.colors.primary)
			.setFooter({ text: "Données fournies par CrawlDoc" })

		// Envoyer l'embed
		interaction.editReply({ embeds: [embed] }).catch(err => {})
	}
}