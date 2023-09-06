const { SlashCommandBuilder } = require("discord.js")
const { rando } = require("@nastyox/rando.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("el2zay.elbot")

// Limites de QI
let limite_inf = 55 // limite la + basse (inférieure)
let limite_sup = 250 // limite la + haute (supérieure)

// Ranges de QI
const ranges = [
	{ min: 55, max: 75, reply: "AHAHAHA BOUUU LE NUL IL A {QI} DE QI 😹😹😹" },
	{ min: 75, max: 95, reply: "T'es un peu claqué mais trkl, ton QI est à {QI}" },
	{ min: 95, max: 115, reply: "Ça vaaa t'es normal, t'as {QI} de QI" },
	{ min: 115, max: 130, reply: "Oooooh, {QI}, c'est pas mal en vrai" },
	{ min: 130, max: 150, reply: "Olala tu es intelligent t'as {QI}" },
	{ min: 150, max: 160, reply: "{QI} de QI ?? Oh le-" },
	{ min: 160, max: 170, reply: "Scuse nous celui avec {QI} de QI" },
	{ min: 170, max: 235, reply: "{QI} de QI, oh le melon de fou" },
	{ min: 235, max: 243, reply: "OOOOeuuuuuu gnagna je suis le mec le plus intelligent gnagna j'ai {QI} de QI" },
	{ min: 243, max: 250, reply: "Frérot t'as cru t'étais Einstein, comment ça {QI} ??" }
]

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("qi")
		.setDescription("Connaitre le QI fictif d'un membre du serveur, ou de soi-même")
		.addUserOption(option => option
			.setName("membre")
			.setDescription("Le membre dont on veut connaitre le QI")
			.setRequired(false)),

	async execute(interaction){
		// Déterminer le membre
		var member
		if(await interaction.options.getUser("membre")) member = await interaction.options.getUser("membre")
		else member = interaction.user

		// Si on a déjà le QI dans la BDD
		var qi
		if(await bacheroFunctions.database.has(database, `qi-${member.id}`)) qi = await bacheroFunctions.database.get(database, `qi-${member.id}`)
		else {
			// Sinon on le génère
			qi = rando(limite_inf, limite_sup)

			// Si le membre est un bot
			if(member.bot && qi > 40) qi -= 10 // on baisse leurs QI car bouu c'est des bots

			// On enregistre le QI dans la BDD
			await bacheroFunctions.database.set(database, `qi-${member.id}`, qi)
		}

		// Faire une réponse
		var response = ""
		for(const range of ranges){ // on passe par chaque range
			if(qi >= range.min && qi <= range.max){
				// On définit la réponse
				response = range.reply.replace("{QI}", qi)
				break // arrêter la boucle
			}
		}

		// Répondre à l'interaction
		await interaction.reply(response).catch(err => {})
	}
}