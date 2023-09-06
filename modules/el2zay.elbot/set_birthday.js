const { SlashCommandBuilder } = require("discord.js")
const { isValid, parse } = require("date-fns")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("set_birthday")
		.setDescription("Ajouter ou modifier la date de son anniversaire")
		.addIntegerOption(option => option
			.setName("jour")
			.setDescription("Le jour de votre anniversaire")
			.setMinValue(1)
			.setMaxValue(31)
			.setRequired(true))
		.addStringOption(option => option
			.setName("mois")
			.setDescription("Le mois de votre anniversaire")
			.setRequired(true)
			.addChoices(
				{ name: "Janvier", value: "01" },
				{ name: "Février", value: "02" },
				{ name: "Mars", value: "03" },
				{ name: "Avril", value: "04" },
				{ name: "Mai", value: "05" },
				{ name: "Juin", value: "06" },
				{ name: "Juillet", value: "07" },
				{ name: "Août", value: "08" },
				{ name: "Septembre", value: "09" },
				{ name: "Octobre", value: "10" },
				{ name: "Novembre", value: "11" },
				{ name: "Décembre", value: "12" },
			))
		.addIntegerOption(option => option
			.setName("annee")
			.setDescription("L'année de votre anniversaire")
			.setMinValue(1970)
			.setMaxValue(new Date().getFullYear() - 4)
			.setRequired(true)),

	async execute(interaction){
		const jour = interaction.options.getInteger("jour")
		const mois = interaction.options.getString("mois")
		const annee = interaction.options.getInteger("annee")
		const date = `${jour}/${mois}/${annee}`

		// Faire réfléchir le bot
		await interaction.deferReply({ ephemeral: true }).catch(err => {})

		function isValidDate(dateString) {
			const parsedDate = parse(dateString, "dd/MM/yyyy", new Date())
			// Si la date est invalide (par exemple, 31/02/2018), isValid renverra false
			return isValid(parsedDate)
		}

		// Si la date n'est pas valide
		if (!isValidDate(date)) {
			return await interaction.editReply({ content: "La date n'est pas valide.", ephemeral: true }).catch(err => {})
		}

		// Si l'année date de moins de 10 ans faire une blague
		if (annee > new Date().getFullYear() - 10) {
			interaction.editReply({ content: "Votre compte sera signalé à Discord et vous serez banni de Discord.", ephemeral: true }).catch(err => {})
			setTimeout(
				() => {
					interaction.editReply({ content: "Nan je déconne, je suis pas un bot de modération.", ephemeral: true }).catch(err => {})
				}
				, 5000
			)
		} else {
			interaction.editReply({ content: `Votre anniversaire est le ${jour}/${mois}/${annee}`, ephemeral: true }).catch(err => {})
		}
	}
	// TODO: Ça la flemme de le finir mais juste rajouter les annivs a la bdd
}