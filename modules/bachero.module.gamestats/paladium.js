var fetch = require("node-fetch")

module.exports.allInOne = async (username) => {
	var profile = await this.fetchProfile(username)
	if(profile.message) return profile
	var trixium = await this.fetchTrixium(profile.uuid)
	if(trixium.message) return trixium

	return { profile, trixium }
}

module.exports.fetchProfile = async (username) => {
	// Obtenir les infos via l'API
	var response = await fetch(`https://api.paladium.games/v1/paladium/player/profile/${username}`).catch(err => { return { message: err } })

	// Tenter de parser
	var json
	try {
		json = await response.json()
	} catch(e) {
		json = { message: response?.message || response?.statusText || "Une erreur inconnue est survenue" }
	}

	// On retourne les infos
	return json
}

module.exports.fetchTrixium = async (uuid) => {
	// Obtenir les infos via l'API
	var response = await fetch(`https://api.paladium.games/v1/paladium/ranking/trixium/player/${uuid}`).catch(err => { return { message: err } })

	// Tenter de parser
	var json
	try {
		json = await response.json()
	} catch(e) {
		json = { message: response?.message || response?.statusText || "Une erreur inconnue est survenue" }
	}

	// On retourne les infos
	return json
}