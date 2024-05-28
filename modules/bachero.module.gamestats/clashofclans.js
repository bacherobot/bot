var fetch = require("node-fetch")

module.exports.fetchProfile = async (tag) => {
	// Obtenir les infos via l'API
	var response = await fetch(`https://api.clashofclans.com/v1/players/%23${tag}`, {
		headers: { "Authorization": `Bearer ${process.env.CLASHOFCLANS_API_KEY}` }
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

module.exports.rolesClan = {
	"leader": "Chef",
	"coLeader": "Chef adjoint",
	"admin": "Ainé",
	"member": "Membre",
	"new": "Nouveau" // pas sûr pour celle-ci, à vérifier ça vient de GH Copilot
}

module.exports.villageNames = {
	"home": "Village principal",
	"builderBase": "Village ouvrier"
}