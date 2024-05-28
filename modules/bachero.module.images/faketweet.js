const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js")
const screenshot = require("screenshothtml")
const fs = require("fs")
const path = require("path")
const bacheroFunctions = require("../../functions")

// Liste des profils
var profils = [
	{
		username: "Pediavenir",
		handle: "Pediavenir",
		views: [90, 750],
		avatar: "pediavenir.png",
		showFake: false
	},
	{
		username: "Youri 🦊🍃",
		handle: "Youridefou",
		views: [3, 30],
		avatar: "youridefou.png",
		showFake: false
	},
	{
		username: "Bruno Attal",
		handle: "Bruno_Attal_",
		views: [70, 150],
		avatar: "brunoattal.png",
		showFake: false
	},
	{
		username: "Jean-Luc Mélenchon",
		handle: "JLMelenchon",
		views: [15, 20],
		avatar: "jeanlucmelenchon.png",
		showFake: true
	},
	{
		username: "BFMTV",
		handle: "BFMTV",
		views: [15, 90],
		avatar: "bfmtv.png",
		showFake: false
	},
	{
		username: "Louis Boyard",
		handle: "LouisBoyard",
		views: [70, 900],
		avatar: "louisboyard.png",
		showFake: true
	},
	{
		username: "Jordan Bardella",
		handle: "J_Bardella",
		views: [15, 90],
		avatar: "jordanbardella.png",
		showFake: false
	},
	{
		username: "Damien Rieu",
		handle: "DamienRieu",
		views: [37, 150],
		avatar: "damienrieu.png",
		showFake: false
	},
	{
		username: "Jean MESSIHA",
		handle: "JeanMessiha",
		views: [20, 120],
		avatar: "jeanmessiha.png",
		showFake: false
	},
	{
		username: "Emmanuel Macron",
		handle: "EmmanuelMacron",
		views: [700, 999],
		avatar: "emmanuelmacron.png",
		showFake: true
	},
	{
		username: "Cerfia",
		handle: "CerfiaFR",
		views: [62, 600],
		avatar: "cerfiafr.png",
		showFake: false
	},
	{
		username: "AlertesInfos",
		handle: "AlertesInfos",
		views: [80, 580],
		avatar: "alertesinfos.png",
		showFake: false
	},
	{
		username: "Elon Musk",
		handle: "elonmusk",
		views: [700, 999],
		avatar: "elonmusk.png",
		showFake: false
	},
	{
		username: "Tibo InShape",
		handle: "TiboInShape",
		views: [12, 80],
		avatar: "tiboinshape.png",
		showFake: false
	},
	{
		username: "General Michel Aoun",
		handle: "General_Aoun",
		views: [10, 40],
		avatar: "generalaoun.png",
		showFake: true
	},
	{
		username: "OpenAI",
		handle: "OpenAI",
		views: [500, 800],
		avatar: "openai.png",
		showFake: false
	},
	{
		username: "Zen Émission",
		handle: "ZenEmission",
		views: [35, 90],
		avatar: "zen.png",
		showFake: false
	},
	{
		username: "Valérie Pécresse",
		handle: "vpecresse",
		views: [15, 35],
		avatar: "pecresse.png",
		showFake: true
	}
]

// Échapper les caractères spéciaux
function escapeHtml(text){
	if(!text) return text
	if(typeof text != "string") return text
	return text?.replace(/&/g, "&amp;")?.replace(/</g, "&lt;")?.replace(/>/g, "&gt;")?.replace(/"/g, "&quot;")?.replace(/'/g, "&apos;")
}

// Variables
var formatterTweetTime = new Intl.DateTimeFormat("fr-FR", { hourCycle: "h12", hour: "numeric", minute: "2-digit" })
var formatterTweetDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })

// Générer une page qui contient un tweet
var tweetHTML = fs.readFileSync(path.join(bacheroFunctions.foldersPath.modules, "bachero.module.images", "web", "faketweet.html"), "utf8")
function generateTweetHTML(content, profil){
	// Créer des informations qui seront affichés dans le tweet
	var time = formatterTweetTime.format(new Date())
	var date = formatterTweetDate.format(new Date())

	// Générer un nombre de vue aléatoire entre les deux valeurs, ça doit contenir une virgule
	var views = ((Math.random() * (profil.views[1] - profil.views[0] + 1)) + profil.views[0]).toFixed(1)
	if(views.includes(".0")) views = views.replace(".0", "")
	views = views.replace(".", ",")

	// Échapper les caractères spéciaux
	content = escapeHtml(content)

	// Ajouter les hashtags et mentions dans un span.blue
	var hashtags = content.match(/#[^\s]+/g)
	var mentions = content.match(/@[^\s]+/g)
	if(hashtags) hashtags.forEach(hashtag => content = content.replace(hashtag, `<span class="blue">${hashtag}</span>`))
	if(mentions) mentions.forEach(mention => content = content.replace(mention, `<span class="blue">${mention}</span>`))

	// Retourner le HTML du tweet avec certains remplacements
	return tweetHTML
		.replace("{{ CONTENT }}", content)
		.replace("{{ VIEWS }}", views)
		.replace("{{ TIME }}", time)
		.replace("{{ DATE }}", date)
		.replace("{{ USERNAME }}", profil.username)
		.replace("{{ HANDLE }}", profil.handle)
		.replace("{{ AVATAR }}", profil.avatar)
		.replace("{{ FAKECONTAINER }}", profil.showFake ? "" : "hidden")
}

// Cache
var cache
if(global.faketweetCache) cache = global.faketweetCache
else {
	const NodeCache = require("node-cache")
	cache = new NodeCache()
	global.faketweetCache = cache
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("faketweet")
		.setDescription("Génère un faux tweet provenant d'un compte que vous pouvez définir")
		.addStringOption(option => option.setName("content")
			.setDescription("Texte à afficher dans le tweet")
			.setMaxLength(400)
			.setRequired(true))
		.addStringOption(option => option.setName("author")
			.setDescription("Auteur du faux tweet, certains comptes afficheront un watermark")
			.setChoices(profils.map(profil => { return { name: profil.username, value: profil.handle } }))
			.setRequired(true)),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir le texte du tweet et l'auteur
		const tweetContent = interaction.options.getString("content")
		var tweetAuthor = interaction.options.getString("author")
		tweetAuthor = profils.find(profil => profil.handle == tweetAuthor)
		if(!tweetAuthor) return interaction.editReply("Auteur de tweet invalide : cette erreur devrait pas arriver, signaler la svp").catch(err => { return "stop" })

		// On vérifie si ce texte est déjà en cache
		var cachedTweet = cache.get(`${tweetAuthor.handle}:${tweetContent}`)
		if(cachedTweet){
			const attachment = new AttachmentBuilder(cachedTweet, { name: "faketweet.png" })
			interaction.editReply({ files: [attachment] })
			return
		}

		// Générer une page pour le tweet et la capturer
		var uniqueId = Date.now()
		var htmlTempPath = path.join(bacheroFunctions.foldersPath.modules, "bachero.module.images", "web", `faketweet_temp_${uniqueId}.html`)
		fs.writeFileSync(htmlTempPath, generateTweetHTML(tweetContent, tweetAuthor))
		var image = await screenshot({
			html: `url:file://${htmlTempPath}`,
			viewportWidth: 540,
			viewportHeight: 180,
			waitForDomLoaded: false,
		})
		fs.unlinkSync(htmlTempPath)

		// Ajouter l'image dans le cache
		cache.set(`${tweetAuthor.handle}:${tweetContent}`, image)

		// Créer un attachement pour l'image et l'envoyer
		const attachment = new AttachmentBuilder(image, { name: "faketweet.png" })
		await interaction.editReply({ files: [attachment] }).catch(err => { return "stop" })
	}
}