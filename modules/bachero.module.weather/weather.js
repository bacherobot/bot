const { SlashCommandBuilder, EmbedBuilder, escapeMarkdown } = require("discord.js")
const bacheroFunctions = require("../../functions")
const fetch = require("node-fetch")

// Obtenir la clé d'API
var apiKey = process.env.WEATHERAPI_KEY
if(!apiKey?.length) return bacheroFunctions.showLog("warn", "Aucune clé d'API pour la commande weather du module \"bachero.module.weather\" n'a pu être trouvé. La commande sera désactivé", "weathercmd-no-key")

// Cache
var cache
if(global.weatherCache) cache = global.weatherCache
else {
	const NodeCache = require("node-cache")
	cache = new NodeCache()
	global.weatherCache = cache
}

// Fonction pour convertir un string au format 12h en 24h (Exemple: "12:00 AM" => "00:00")
function convert12hTo24h(str){
	// Obtenir les heures et les minutes
	var hours = parseInt(str.split(":")[0])
	var minutes = parseInt(str.split(":")[1].split(" ")[0])

	// Si on est en PM, ajouter 12 heures
	if(str.toLowerCase().includes("pm")) hours += 12

	// Retourner le résultat
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("weather")
		.setDescription("Afficher des informations sur la météo d'un lieu")
		.addStringOption(option => option.setName("search")
			.setDescription("Nom de la ville, latitude et longitude séparés par une virgule, ou adresse IP")
			.setRequired(true)),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir le terme de recherche
		var query = interaction.options.getString("search")
		if(query.toLowerCase().includes("auto:ip")) query = "Paris" // on empêche de définir "auto:ip" car ça ferait fuiter l'IP du serveur
		if(query.toLowerCase() == "ntr") query = "Nanterre" // 92i représente

		// Si on a déjà un résultat en cache
		if(cache.has(query)) return interaction.editReply({ embeds: [cache.get(query)] }).catch(err => {})

		// Obtenir la météo
		var weather = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=1&aqi=no&alerts=no&lang=fr`, { headers: { "User-Agent": "BacheroBot (+https://github.com/bacherobot/bot)" } }).then(res => res.json()).catch(err => { return { error: true, message: err } })

		// Si on a une erreur
		if(weather?.error?.message == "No matching location found.") return interaction.editReply({ content: "Aucun résultat n'a pu être trouvé pour ce terme de recherche." }).catch(err => {})
		if(weather.error || !weather?.location?.name || !weather?.current) return await bacheroFunctions.report.createAndReply("requête vers l'API de WeatherAPI", weather?.error?.message || weather?.message || weather?.error || weather, { query: encodeURIComponent(query) }, interaction)

		// Obtenir le temps de la journée
		var today = weather?.forecast?.forecastday?.[0]

		// Gérer les prévisions par heures
		var hours = [7, 12, 15, 18, 21]
		var hoursForecast = today?.hour?.filter(h => hours.includes(parseInt(h?.time?.split(" ")[1]?.split(":")[0])))

		// Créer l'embed
		var embed = new EmbedBuilder()
			.setTitle(`Météo à ${weather.location.name}${weather.location?.region ? ` (${weather.location?.region})` : ""}${weather.location?.country != "France" ? `, ${weather.location?.country}` : ""}`)
			.setDescription(`Météo actuelle : ${escapeMarkdown(weather?.current?.condition?.text)}\nHeure locale : ${weather?.location?.localtime?.split(" ")?.[1]} | Dernière MÀJ : <t:${Math.round(weather?.current?.last_updated_epoch)}:R>`)
			.setFields([
				typeof weather?.current?.temp_c == "number" ? { name: "Temp. actuelle", value: `${Math.round(weather?.current?.temp_c)}°C`, inline: true } : null,
				typeof weather?.current?.feelslike_c == "number" ? { name: "Ressentie actuelle", value: `${Math.round(weather?.current?.feelslike_c)}°C`, inline: true } : null,
				{ name: "Événements prévus", value: today.day.daily_will_it_rain && today.day.daily_will_it_snow ? "Pluie et neige prévues" : today.day.daily_will_it_rain ? "Pluie prévue" : today.day.daily_will_it_snow ? "Neige prévue" : "Ni pluie ni neiges prévues", inline: true },
				typeof today?.day?.mintemp_c == "number" ? { name: "Temp. minimale", value: `${Math.round(today?.day?.mintemp_c)}°C`, inline: true } : null,
				typeof today?.day?.avgtemp_c == "number" ? { name: "Temp. moyenne", value: `${Math.round(today?.day?.avgtemp_c)}°C`, inline: true } : null,
				typeof today?.day?.maxtemp_c == "number" ? { name: "Temp. maximale", value: `${Math.round(today?.day?.maxtemp_c)}°C`, inline: true } : null,
				typeof weather?.current?.precip_mm == "number" ? { name: "Précipitations", value: `${weather?.current?.precip_mm?.toString()?.replace(".", ",")} mm`, inline: true } : null,
				typeof weather?.current?.cloud == "number" ? { name: "Nuages", value: `${weather?.current?.cloud}%`, inline: true } : null,
				typeof weather?.current?.wind_kph == "number" ? { name: "Vent", value: `${weather?.current?.wind_kph?.toString()?.replace(".", ",")} km/h`, inline: true } : null,
				!isNaN(today?.astro?.sunrise) && !isNaN(today?.astro?.sunset) ? { name: "Soleil", value: `Lever : ${convert12hTo24h(today?.astro?.sunrise)}\nCoucher : ${convert12hTo24h(today?.astro?.sunset)}`, inline: true } : null,
				!isNaN(today?.astro?.moonrise) && !isNaN(today?.astro?.moonset) ? { name: "Lune", value: `Lever : ${convert12hTo24h(today?.astro?.moonrise)}\nCoucher : ${convert12hTo24h(today?.astro?.moonset)}`, inline: true } : null,
				hoursForecast?.length ? { name: "Prévisions par heures", value: hoursForecast.map(h => `- **${h?.time?.split(" ")[1]} :** Temp. ${Math.round(h?.temp_c)}°C  |  Ress. ${Math.round(h?.feelslike_c)}°C`).join("\n"), inline: false } : null
			].filter(f => f != null))
			.setThumbnail(`https:${weather?.current?.condition?.icon}`)
			.setColor(bacheroFunctions.colors.primary)
			.setFooter({ text: "Données fournies par WeatherAPI" })

		// Envoyer l'embed
		interaction.editReply({ embeds: [embed] }).catch(err => {})

		// Mettre en cache l'embed
		cache.set(query, embed, 60 * 5)
	}
}