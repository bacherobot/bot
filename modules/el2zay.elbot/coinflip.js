const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const { customAlphabet } = require("nanoid"), nanoid = customAlphabet("abcdefghiklnoqrstuvyz123456789", 14)
// const faceEmoji = "<:face:1143610184669859981>" // Note: on dirait que les emojis ne fonctionnent pas en slash commands
// const pileEmoji = "<:pile:1143610180630745249>"

// Générer un embed
function generateEmbed(lastResult, succession = 0){
	// Déterminer si c'est pile ou face
	var random = Math.floor(Math.random() * 2)
	if(random == 0) random = "pile"
	else random = "face"

	// Si c'est le même résultat que le dernier
	if(lastResult && random == lastResult) succession++
	else succession = 0

	// Faire l'embed
	var embed = new EmbedBuilder()
		.setTitle("Résultat")
		.setDescription(`**C'est ${random} !**${succession ? `\n(x${succession + 1})` : ""}`)
		.setColor(bacheroFunctions.colors.primary)
		.setThumbnail(`https://cdn.discordapp.com/emojis/${random == 'pile' ? "1143610180630745249" : "1143610184669859981"}.png`)

	// Retourner
	return { embed, succession, random, lastResult: lastResult || random }
}

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("coinflip")
		.setDescription("Pile ou face ?"),

	async execute(interaction){
		// Defer l'interaction, et obtenir un id
		if(interaction.sourceType !== "textCommand") var id = (await interaction.deferReply().catch(err => {}))?.id
		if(!id) var id = nanoid() // si on defer pas l'interaction, on a pas l'id du message, donc on génère un id nous même

		// Créé un bouton pour relancer
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(`coinflip-${id}`)
			.setLabel("Relancer")
			.setStyle(ButtonStyle.Primary),)

		// On répond à l'interaction
		var results = generateEmbed()
		await interaction[interaction.sourceType == "textCommand" ? "reply" : "editReply"]({ embeds: [results.embed], components: [row] }).catch(err => {})

		// Nombre de successions du même résultat
		var succession = results.succession
		var lastResult

		// On détecte si qlqn relance
		const collector = interaction.channel.createMessageComponentCollector({ filter: i => i.customId === `coinflip-${id}` })
		collector.on("collect", async i => {
			// Si la personne qui clique n'est pas la bonne personne
			if(i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true }).catch(err => {})

			// Si le résultat est le même que le dernier
			var results = generateEmbed(lastResult, succession)
			succession = results.succession
			lastResult = results.random

			// On répond à l'interaction
			await i.update({ embeds: [results.embed], components: [row] }).catch(err => {})
		})
	}
}

