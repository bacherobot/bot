const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, time } = require("discord.js")
const { isValid } = require("date-fns")

// Générer une date aléatoire
function generateRandomDate(type){
	// Préparer des variables pour plus tard
	var relative, timeString, date = new Date()

	// En fonction du type
	if (type == "time-date") {
		date.setFullYear(new Date().getFullYear() + 1)
		date.setMonth(Math.floor(Math.random() * 12))
		date.setDate(Math.floor(Math.random() * 30) + 1)
		date.setHours(Math.floor(Math.random() * 24))
		date.setMinutes(Math.floor(Math.random() * 60))
		date.setSeconds(Math.floor(Math.random() * 60))
	}
	if (type == "date") {
		date.setFullYear(new Date().getFullYear() + 1)
		date.setMonth(Math.floor(Math.random() * 12))
		date.setDate(Math.floor(Math.random() * 30) + 1)
	}
	if (type == "time") {
		date.setHours(Math.floor(Math.random() * 24))
		date.setMinutes(Math.floor(Math.random() * 60))
		date.setSeconds(Math.floor(Math.random() * 60))
	}

	// Si la date est invalide (genre le 30 février)
	if((date < new Date() || !isValid(date)) && type !== "time") return generateRandomDate(type)

	// Formater la date en fonction du type
	if (type == "time-date") timeString = time(date, "F") // JJ/MM/AAAA hh:mm:ss
	else if (type == "date") timeString = time(date, "D") // JJ/MM/AAAA
	else timeString = time(date, "T") // hh:mm:ss
	relative = time(date, "R") // Date relative

	// On retourne les variables
	return { timeString, relative }
}

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("random-time")
		.setDescription("Générer un temps ou une date aléatoire")
		.addStringOption(option => option
			.setName("type")
			.setDescription("Type de temps à générer")
			.setChoices(
				{ name: "JJ/MM/AAAA hh:mm", value: "time-date" },
				{ name: "JJ/MM/AAAA", value: "date" },
				{ name: "hh:mm:ss", value: "time" },
			)
			.setRequired(true)),

	async execute(interaction){
		// Obtenir le type et defer l'interaction
		var type = interaction.options.getString("type")
		let msg = await interaction.deferReply().catch(err => {})

		// Générer une date aléatoire
		var { timeString, relative } = generateRandomDate(type)

		// Créé un bouton pour relancer
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(`relancer-${msg.id}`)
			.setLabel("Relancer")
			.setStyle(ButtonStyle.Primary))

		// Répondre à l'interaction
		await interaction.editReply({ content: `${timeString} ${relative}`, components: [row] }).catch(err => {})

		// Créer un collector pour le bouton
		const collector = interaction.channel.createMessageComponentCollector({ filter: i => i.customId == `relancer-${msg.id}` })
		collector.on("collect", async i => {
			// Si la personne veut relancer
			if (i.customId == `relancer-${msg.id}`) {
				// Si c'est pas la bonne personne
				if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true }).catch(err => {})

				// Générer une nouvelle date, et mettre à jour le message
				var { timeString, relative } = generateRandomDate(type)
				await i.update({ content: `${timeString} (${relative})`, components: [row] }).catch(err => {})
			}
		})
	}
}