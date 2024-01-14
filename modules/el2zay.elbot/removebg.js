const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const fetch = require("node-fetch")
const FormData = require("form-data")

// Obtenir la liste des tokens
var tokens = process.env.REMOVEBG_TOKENS?.length ? JSON.parse(process.env.REMOVEBG_TOKENS) : []
if(!tokens?.length) return bacheroFunctions.showLog("warn", "Aucune clés d'API pour la commande removebg du module \"el2zay.elbot\" n'a pu être trouvé. La commande sera désactivé", "removebgcmd-no-tokens")
var token = tokens[0] // le token utilisé, vu qu'on va alterner

// Fonction pour vérifier un token, et utiliser le prochain si nécessaire
async function checkToken(interaction, i = 0){
	// Si on a pas de token, on prend le premier
	if(!token) token = tokens[0]

	// Si on a vérifié tous les tokens, on arrête
	if(i >= tokens.length) return bacheroFunctions.report.createAndReply("vérifications des tokens Remove.bg", "Toutes les clés d'APIs sont invalides ou sont épuisées. Réessayer plus tard ou contacter l'administrateur de cette instance.", {}, interaction)

	// Vérifier le token, et le crédit disponible
	var hasFailed = false
	await fetch("https://api.remove.bg/v1.0/account", { headers: { "X-Api-Key": token } })
		.then(res => res.json())
		.then(data => {
			if(!data?.data?.attributes?.credits){
				token = tokens.length > 1 ? tokens[tokens.indexOf(token) + 1] : tokens[0]
				checkToken(interaction, i += 1)
			}
		})
		.catch(error => {
			hasFailed = true
			if(interaction) return bacheroFunctions.report.createAndReply("vérification d'un token Remove.bg", error, {}, interaction)
		})

	// On retourne que c'est bon
	return !hasFailed
}

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("removebg")
		.setDescription("Retirer l'arrière plan d'une image")
		.addSubcommand(subcommand => subcommand
			.setName("url")
			.setDescription("Retirer l'arrière plan d'une image en ligne")
			.addStringOption(option => option
				.setName("url")
				.setDescription("L'URL de l'image")
				.setRequired(true)))
		.addSubcommand(subcommand => subcommand
			.setName("attachement")
			.setDescription("Retirer l'arrière plan d'une image envoyée en pièce jointe")
			.addAttachmentOption(option => option
				.setName("image")
				.setDescription("Image en pièce jointe")
				.setRequired(true))),

	async execute(interaction){
		// Defer l'interaction
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir le lien de l'image
		var url = interaction.options?.getAttachment("image")?.url || interaction.options?.getString("url")

		// Préparer le formdata pour la requête
		const formData = new FormData()
		formData.append("size", "auto")
		formData.append("image_url", url)

		// Vérifier le token
		if(!await checkToken(interaction)) return

		// Enlever le fond de l'image
		var response = await fetch("https://api.remove.bg/v1.0/removebg", {
			method: "POST",
			body: formData,
			headers: {
				"X-Api-Key": token,
			}
		}).catch(error => {
			if(interaction) bacheroFunctions.report.createAndReply("requête vers l'API de Remove.bg", error, { image_url: url }, interaction)
			return "stop"
		})

		// Si la requête a échoué
		if(response == "stop") return

		// Si on arrive à parse en JSON, c'est que la requête a échoué
		var response = await response.buffer()
		var shouldStop = false
		try {
			var jsonRes = JSON.parse(response.toString())
			if(interaction && jsonRes && jsonRes?.errors){
				bacheroFunctions.report.createAndReply("requête vers l'API de Remove.bg", jsonRes?.errors?.map(err => err?.title + (err?.code ? ` -- ${err.code}` : "")) || jsonRes?.errors || jsonRes, {}, interaction)
			}
			shouldStop = true
		} catch (error) {}
		if(shouldStop) return

		// Créer un attachement
		var attachement = new AttachmentBuilder(response, { name: "nobg.png" })

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle("Image sans arrière plan")
			.setImage("attachment://nobg.png")
			.setColor(bacheroFunctions.colors.primary)
			.setFooter({ text: "Via Remove.bg", iconURL: "https://www.remove.bg/apple-touch-icon.png" })

		// Répondre avec l'embed et l'attachement
		interaction.editReply({ embeds: [embed], files: [attachement] }).catch(err => {})
	}
}
