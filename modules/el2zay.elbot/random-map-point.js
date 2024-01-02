const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const fetch = require("node-fetch")

// Liste de grandes villes, avec leurs coordonnées GPS
const cities = [
	{ name: "Paris, France", latitude: 48.8566, longitude: 2.3522 },
	{ name: "Marseille, France", latitude: 43.2965, longitude: 5.3698 },
	{ name: "Lyon, France", latitude: 45.7640, longitude: 4.8357 },
	{ name: "Toulouse, France", latitude: 43.6047, longitude: 1.4442 },
	{ name: "Strasbourg, France", latitude: 48.5734, longitude: 7.7521 },
	{ name: "Montpellier, France", latitude: 43.6108, longitude: 3.8767 },
	{ name: "Bordeaux, France", latitude: 44.8378, longitude: -0.5792 },
	{ name: "Lille, France", latitude: 50.6293, longitude: 3.0573 },
	{ name: "Rennes, France", latitude: 48.1173, longitude: -1.6778 },
	{ name: "Madrid, Espagne", latitude: 40.4168, longitude: -3.7038 },
	{ name: "Rome, Italie", latitude: 41.9028, longitude: 12.4964 },
	{ name: "Milan, Italie", latitude: 45.4642, longitude: 9.1900 },
	{ name: "Berlin, Allemagne", latitude: 52.5200, longitude: 13.4050 },
	{ name: "Hambourg, Allemagne", latitude: 53.5511, longitude: 9.9937 },
	{ name: "Bruxelles, Belgique", latitude: 50.8503, longitude: 4.3517 },
	{ name: "Zurich, Suisse", latitude: 47.3769, longitude: 8.5417 },
	{ name: "Genève, Suisse", latitude: 46.2044, longitude: 6.1432 },
]

// Fonction pour générer des coordonnées GPS aléatoires dans une ville
function generateRandomCoordinates() {
	// Déterminer une ville aléatoire
	const randomCity = cities[Math.floor(Math.random() * cities.length)]

	// Ajoutez un décalage aléatoire pour obtenir une position GPS dans la ville, mais pas exactement au centre
	const latitudeOffset = Math.random() * (0.2 - 0.1)
	const longitudeOffset = Math.random() * (0.2 - 0.1)

	// Calculez les coordonnées GPS finales, et les retourner
	const latitude = randomCity.latitude + latitudeOffset
	const longitude = randomCity.longitude + longitudeOffset
	return { latitude, longitude, city: randomCity.name }
}

// Pouvoir récupérer le nom d'un lieu à partir de ses coordonnées GPS
async function getPlaceName(latitude, longitude) {
	// Si on a pas de clé OpenCage, on retourne rien
	if(!process.env.OPENCAGE_API_KEY) return undefined

	// On fait une requête à l'API OpenCage
	const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=${process.env.OPENCAGE_API_KEY}`).then(res => res.json()).catch(err => {})

	// On retourne le résultat
	var result
	if(response?.results?.length) result = response.results[0]
	if(result?.formatted) return result.formatted

	// Si on a pas de résultat, on retourne rien
	return undefined
}

// Fonction pour générer un embed et les boutons
async function generateEmbed(msg){
	// Générer la latitude/longitude, et le nom du lieu
	var { latitude, longitude, city } = generateRandomCoordinates()
	var placeName = await getPlaceName(latitude, longitude)

	// On crée les boutons
	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`elbotmap-relancer-${msg.id}`)
			.setLabel("Relancer")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setURL(`https://maps.apple.com/?q=${latitude},${longitude}`) // Sur Android ou sur PC ça redirige vers Google Maps, mais sur iOS ça ouvre l'application native Apple Maps
			.setLabel("Ouvrir")
			.setStyle(ButtonStyle.Link)
	)

	// Créer l'embed et répondre avec
	var embed = new EmbedBuilder()
		.setTitle("Localisation aléatoire")
		.setFields([
			{ name: "Latitude", value: latitude.toString(), inline: true },
			{ name: "Longitude", value: longitude.toString(), inline: true },
			city ? { name: "Nom approximatif", value: city, inline: true } : null,
			placeName ? { name: "Nom exacte", value: placeName, inline: true } : null
		].filter(Boolean))
		.setColor(bacheroFunctions.colors.primary)
		.setImage(`https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=13&size=600x300&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`) // ici on utilise une clé prédéfini, elle devrait fonctionner pour cet endpoint
		.setFooter({ text: `Via Google Maps${placeName ? " et OpenCage" : ""}` })

	// On retourne tout
	return { embeds: [embed], components: [row] }
}

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("random-map-point")
		.setDescription("Génère des coordonnées GPS aléatoires"),

	async execute(interaction){
		// On defer l'interaction
		let msg = await interaction.deferReply().catch(err => {})

		// On obtient l'embed et les boutons
		var generated = await generateEmbed(msg)
		await interaction.editReply(generated).catch(err => {})

		// Créer le collector pour détecter quand quelqu'un veut relancer
		const collector = interaction.channel.createMessageComponentCollector({ filter: i => i.customId === `elbotmap-relancer-${msg.id}` })
		collector.on("collect", async i => {
			if (i.customId == `elbotmap-relancer-${msg.id}`) {
				// Si c'est pas le bon utilisateur, on répond avec un message d'erreur
				if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true }).catch(err => {})

				// On obtient l'embed et les boutons
				var generated = await generateEmbed(msg)
				await interaction.editReply(generated).catch(err => {})

				// On met à jour l'interaction
				i.update(generated).catch(err => {})
			}
		})
	}
}
