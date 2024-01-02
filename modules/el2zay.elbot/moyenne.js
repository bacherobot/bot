const { SlashCommandBuilder } = require("discord.js")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("moyenne")
		.setDescription("Calculer la moyenne de deux nombres")
		.addNumberOption(option => option
			.setName("n1")
			.setDescription("Premier nombre")
			.setMinValue(0)
			.setRequired(true))
		.addNumberOption(option => option
			.setName("n2")
			.setDescription("Deuxième nombre")
			.setMinValue(0)
			.setRequired(true)),

	async execute(interaction){
		// Faire des calculs j'ai pas tt capter j'sais même pas comment j'ai eu le brevet frr
		var div = (interaction.options.getNumber("n1") / interaction.options.getNumber("n2"))
		let surVingt = Math.round(div * 20 * 100) / 100
		let surDix = Math.round(div * 10 * 100) / 100

		if (surVingt == 20) {
			await interaction.reply(`**BRAVOOOOOO!** 🎉🎉🎉🎉 Ta est de ${surVingt}/20 donc de ${surDix}/10 🎉🎉🎉🎉`).catch(err => {})
		} else if (surVingt >= 17 && surVingt < 20) {
			await interaction.reply(`**OOOOH GG** 👏👏 Ta note est de ${surVingt}/20 donc de ${surDix}/10 👏👏`).catch(err => {})
		} else if (surVingt >= 13 && surVingt < 17) {
			await interaction.reply(`C'est pas si mal ! Ta note est de ${surVingt}/20 donc de ${surDix}/10 👏👏`).catch(err => {})
		} else if (surVingt >= 10 && surVingt < 13) {
			await interaction.reply(`Ça passe... t'as la moyenne. Ta note est de ${surVingt}/20 donc de ${surDix}/10`).catch(err => {})
		} else if (surVingt >= 5 && surVingt < 10) {
			await interaction.reply(`Je ne souhaite pas m'exprimer à propos de ce sujet... Ta note est de ${surVingt}/20 donc de ${surDix}/10`).catch(err => {})
		} else if (surVingt <= 5 && surVingt >= 0) {
			await interaction.reply(`On va revoir les bases parce que vous êtes trop con (ref à Orelsan t'as capté). Ta note est de ${surVingt}/20 donc de ${surDix}/10`).catch(err => {})
		} else {
			var sentence = ["Alors frérot c'est impossible", "T'as vraiment eu ça mon reuf ?", "Tu m'as pris pour rmxbot pour être aussi con ?", "C'est mathématiquement statistiquement certainement impossible."]
			var random = Math.floor(Math.random() * sentence.length)
			await interaction.reply(sentence[random]).catch(err => {})
		}
	}
}
