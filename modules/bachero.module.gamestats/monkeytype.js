var fetch = require("node-fetch")

module.exports.fetchProfile = async (username) => {
	// Obtenir les infos via l'API
	var response = await fetch(`https://api.monkeytype.com/users/${username}/profile`).catch(err => { return { message: err } })

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

module.exports.badge = {
	1: "Créateur", // I made this
	2: "Collaborateur", // I helped make this
	3: "Modérateur", // Discord server moderator
	4: "Compte OG", // First 1000 users on the site
	5: "Membre Discord OG", // First 1000 Discord server members
	6: "Supporteur", // Donated money
	7: "Sugar Daddy", // Donated a lot of money
	8: "Supporteur Monkey", // Donated more money
	9: "White Hat", // Reported critical vulnerabilities on the site
	10: "Reporteur de bugs", // Reported or helped track down bugs on the site
	11: "Créateur de contenu", // Verified content creator
	12: "Contributeur", // Contributed to the site
	13: "Mytique", // Yes, I'm actually this fast
	14: "All Year Long" // Reached a streak of 365 days
}