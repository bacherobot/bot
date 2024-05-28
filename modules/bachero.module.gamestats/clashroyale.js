var fetch = require("node-fetch")

module.exports.fetchProfile = async (tag) => {
	// Obtenir les infos via l'API
	var response = await fetch(`https://api.clashroyale.com/v1/players/%23${tag}`, {
		headers: { "Authorization": `Bearer ${process.env.CLASHROYALE_API_KEY}` }
	}).catch(err => { return { message: err } })

	// Tenter de parser
	var json
	try {
		json = await response.json()
	} catch(e) {
		json = { message: response?.message || response?.reason || response?.statusText || "Une erreur inconnue est survenue" }
	}
	if(json?.reason) json.message = json.reason

	// On retourne les infos
	return json
}

module.exports.cardsRarity = {
	"common": "commune",
	"rare": "rare",
	"epic": "épique",
	"legendary": "légendaire"
}