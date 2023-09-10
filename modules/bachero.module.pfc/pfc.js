const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js")
const { rando } = require("@nastyox/rando.js")
var CronJob = require("cron").CronJob
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.pfc")
const disableCooldown = bacheroFunctions.config.getValue("bachero.module.pfc", "disableCooldown")
const disableAutoResetLeaderboard = bacheroFunctions.config.getValue("bachero.module.pfc", "disableAutoResetLeaderboard")

// Fonction qui permet de déterminer si un joueur a gagné ou perdu
function determineWinner(playerChoice, playerWinRatio){
	// Enlever le "pfc-" au début du choix du joueur
	playerChoice = playerChoice.replace("pfc-", "")

	// Liste des possibilités du bot
	var botChoices = [
		{ name: "pierre", rate: 50 },
		{ name: "feuille", rate: 50 },
		{ name: "ciseau", rate: 50 }
	]
	botChoices.find(choice => choice.name == playerChoice).rate = 15 // baisser la probabilité que le bot trouve le même résultat que l'utilisateur

	// Si le joueur gagne très peu, augmenter faiblement ses chances de gagner
	if(playerWinRatio < 40) botChoices.find(choice => choice.name == playerChoice).rate -= 10

	// Obtenir une réponse aléatoire du bot
	botChoices = botChoices.flatMap(choice => Array(choice.rate).fill(choice)) // faire un vrai tableau à partir des probabilités
	var botAnswer = rando(botChoices)
	botAnswer = botAnswer.value.name

	// Déterminer si le joueur a gagné, ou perdu
	var winner = ""
	if(playerChoice == "pierre" && botAnswer == "feuille") winner = "bot"
	if(playerChoice == "feuille" && botAnswer == "ciseau") winner = "bot"
	if(playerChoice == "ciseau" && botAnswer == "pierre") winner = "bot"
	if(playerChoice == "pierre" && botAnswer == "ciseau") winner = "player"
	if(playerChoice == "feuille" && botAnswer == "pierre") winner = "player"
	if(playerChoice == "ciseau" && botAnswer == "feuille") winner = "player"
	if(playerChoice == "pierre" && botAnswer == "pierre") winner = "draw"
	if(playerChoice == "feuille" && botAnswer == "feuille") winner = "draw"
	if(playerChoice == "ciseau" && botAnswer == "ciseau") winner = "draw"

	// Retourner le résultat
	return { winner, botAnswer }
}

// Fonction pour réinitialiser les scores
async function resetScores(){
	// Obtenir toute la base de données
	var databaseJSON = await bacheroFunctions.database.getAll(database)

	// Si la dernière fois qu'on a réinitialisé les scores n'était pas il y a plus de 30 jours et 20 heures, ne rien faire
	var lastReset = databaseJSON.lastReset
	if(lastReset && lastReset > Date.now() - ((30 * 24 * 60 * 60 * 1000) + (20 * 60 * 60 * 1000))) return; else databaseJSON.lastReset = Date.now()

	// Réinisialiser les scores de tout le monde
	for(var key of Object.keys(databaseJSON)){
		if(key.startsWith("winCount-")) bacheroFunctions.database.delete(database, key)
		if(key.startsWith("loseCount-")) bacheroFunctions.database.delete(database, key)
	}

	// Définir la date de dernière réinisialisation des scores
	bacheroFunctions.database.set(database, "lastReset", Date.now())
}
if(disableAutoResetLeaderboard != true){
	// Tous les jours à sept heures, tenter de réinitialiser les scores
	new CronJob("0 7 * * *", (async () => {
		resetScores()
	})).start()

	// Vérifier si on devrait supprimer les scores, au moment où le bot démarre
	resetScores()
}

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("pfc")
		.setDescription("Permet de jouer au pierre feuille ciseau")
		.addBooleanOption(option => option.setName("showleaderboard")
			.setDescription("Affiche le classement des joueurs")
			.setRequired(false)),

	// Récupérer le listener bouton (quand quelqu'un clique sur un bouton)
	async interactionListener(listener){
		listener.on("button", async (interaction) => {
			// Vérifier l'identifiant du bouton
			if(interaction.customId != "pfc-pierre" && interaction.customId != "pfc-feuille" && interaction.customId != "pfc-ciseau") return

			// Vérifier que l'auteur de l'identifiant soit le bon
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true })

			// Vérifier si l'utilisateur est limité, et si c'est pas le cas, le limiter
			if(disableCooldown != true){
				var checkAndReply = await bacheroFunctions.cooldown.checkAndReply(interaction, "pfcPlay")
				if(checkAndReply) return; else await bacheroFunctions.cooldown.set("pfcPlay", interaction.user.id, 1000)
			}

			// Obtenir le nombre de victoire/défaite
			var winCount = (await bacheroFunctions.database.get(database, `winCount-${interaction?.user?.id}`)) || 0
			var loseCount = (await bacheroFunctions.database.get(database, `loseCount-${interaction?.user?.id}`)) || 0

			// Déterminer le vainqueur
			var { winner, botAnswer } = determineWinner(interaction.customId, (winCount / (winCount + loseCount)) * 100)

			// Le redéfinir
			if(winner == "player"){
				winCount++
				await bacheroFunctions.database.set(database, `winCount-${interaction?.user?.id}`, winCount)
			}
			if(winner == "bot"){
				loseCount++
				await bacheroFunctions.database.set(database, `loseCount-${interaction?.user?.id}`, loseCount)
			}

			// Si c'est pas un match nul, recalculer le pourcentage de victoire
			var winPercent = (winCount / (winCount + loseCount)) * 100

			// Créé un embed à partir de celui du message
			var embed = new EmbedBuilder(interaction?.message?.embeds[0]?.data)
			embed.setDescription(`Tu as choisi **${interaction.customId.replace("pfc-", "")}** et j'ai choisi **${botAnswer}**.\n\n${winner == "draw" ? "C'est un match nul !" : winner == "player" ? "Bravo, tu as gagné !" : "Dommage, tu as perdu !"}`)
			embed.setFooter({ text: `${winCount} victoire${winCount.length > 1 ? "s" : ""} | ${loseCount} défaite${loseCount.length > 1 ? "s" : ""}${!Math.round(winPercent) ? "" : ` | ${Math.round(winPercent)}% des parties remportées`}` })
			embed.setColor(winner == "draw" ? bacheroFunctions.colors.secondary : winner == "player" ? bacheroFunctions.colors.success : bacheroFunctions.colors.danger)
			interaction.update({ embeds: [embed] }).catch(err => {})
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Si on veut obtenir le classement
		if(interaction.options.getBoolean("showleaderboard")){
			// Vérifier si l'utilisateur est limité, et si c'est pas le cas, le limiter
			var checkAndReply = await bacheroFunctions.cooldown.checkAndReply(interaction, "pfcLeaderboardShow")
			if(checkAndReply) return; else await bacheroFunctions.cooldown.set("pfcLeaderboardShow", interaction.user.id, 10000)

			// Obtenir la base de données entière en JSON
			const databaseJSON = await bacheroFunctions.database.getAll(database)

			// Créé une variable qui contiendra chaque utilisateur de la BDD
			var users = []

			// Pour chaque utilisateur de la BDD, ajouter le nom de l'utilisateur à la variable users
			for(var key of Object.keys(databaseJSON)){
				// Si ça commence par "winCount-"
				if(key.startsWith("winCount-")){
					// Obtenir l'identifiant
					var id = key.split("-")[1]

					// Obtenir le loseCount
					var loseCount = databaseJSON[`loseCount-${id}`]

					// Si on a pas de loseCount, et que le nombre de victoire est inférieure à 10, ignorer
					if(!loseCount && databaseJSON[`winCount-${id}`] < 10) continue

					// Sinon, ajouter l'utilisateur
					users.push({
						id: id,
						winCount: databaseJSON[key],
						loseCount: loseCount,
						winPercent: Math.round((databaseJSON[key] / (databaseJSON[key] + loseCount)) * 100)
					})
				}
			}

			// Si on a rien trouvé, on envoie un message d'erreur
			if(!users.length){
				var embed = new EmbedBuilder()
					.setTitle("Classement")
					.setDescription(`Impossible d'obtenir le classement puisque personne n'y a encore participé. ${databaseJSON.lastReset ? `Le classement a été réinitialisé pour la dernière fois le <t:${Math.round(databaseJSON.lastReset / 1000)}:f>` : ""}`)
					.setColor(bacheroFunctions.colors.secondary)
				return interaction.reply({ embeds: [embed] }).catch(err => {})
			}

			// Trier pour que les utilisateurs avec le pourcentage le plus élevé soit au début
			users.sort((a, b) => b.winPercent - a.winPercent)

			// Créé le contenu du classement
			var leaderboardText = ""
			for(var i = 0; i < users.length; i++){
				if(i >= 10) break
				var user = users[i]
				leaderboardText += `\n**${i + 1}.** ${await bacheroFunctions.parseUserFromString(user.id, "mention")} : ${user.winPercent ? `${user.winPercent}%` : "0%"} - ${user.winCount} victoire${user.winCount.length > 1 ? "s" : ""} | ${user.loseCount} défaite${user.loseCount.length > 1 ? "s" : ""}`
			}

			// Obtenir la position dans le classement
			var position = users.findIndex(user => user.id == interaction.user.id) + 1

			// Créer un embed
			var embed = new EmbedBuilder()
				.setTitle("Classement - interserveur")
				.setDescription(`Voici le classement des joueurs :\n${leaderboardText}`)
				.setColor(bacheroFunctions.colors.primary)
				.setFooter({ text: `Parmis ${users.length} joueurs, ${position == 0 ? "vous n'êtes pas dans le classement" : `vous êtes le ${position}${position == 1 ? "er" : "ème"}`}` })

			// Envoyer l'embed
			await interaction.reply({ embeds: [embed] }).catch(err => {})
		}
		// Sinon, afficher les boutons dans un embed
		else {
			// Obtenir le nombre de victoire/défaite
			var winCount = (await bacheroFunctions.database.get(database, `winCount-${interaction?.user?.id}`)) || 0
			var loseCount = (await bacheroFunctions.database.get(database, `loseCount-${interaction?.user?.id}`)) || 0

			// Calculer son pourcentage de parties gagnés
			var winPercent = (winCount / (winCount + loseCount)) * 100

			// Créer un embed
			var embed = new EmbedBuilder()
				.setTitle("Pierre feuille ciseau")
				.setDescription("Appuie sur un des boutons en dessous de ce message pour jouer au pierre feuille ciseau")
				.setColor(bacheroFunctions.colors.primary)
				.setFooter({ text: `${winCount} victoire${winCount.length > 1 ? "s" : ""} | ${loseCount} défaite${loseCount.length > 1 ? "s" : ""}${!Math.round(winPercent) ? "" : ` | ${Math.round(winPercent)}% des parties remportées`}` })

			// Créé des boutons
			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId("pfc-pierre")
					.setStyle(ButtonStyle.Primary)
					.setEmoji("🪨"),

				new ButtonBuilder()
					.setCustomId("pfc-feuille")
					.setStyle(ButtonStyle.Primary)
					.setEmoji("🍃"),

				new ButtonBuilder()
					.setCustomId("pfc-ciseau")
					.setStyle(ButtonStyle.Primary)
					.setEmoji("✂️"),
			)

			// Répondre à l'interaction
			interaction.reply({ embeds: [embed], components: [row] }).catch(err => {})
		}
	}
}