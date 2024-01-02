const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, time } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("el2zay.elbot")
var botClient

// Fonction pour obtenir les sondages en cours
async function runningPolls() {
	var sondages = Object.values(await bacheroFunctions.database.getAll(database))
	return sondages || []
}

// Fonction pour générer un embed avec propositions
function generateEmbed(sondage, reason) {
	// Boutons pour voter
	var row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`sondageCmd-one-${sondage.id}`)
			.setEmoji("1️⃣")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(`sondageCmd-two-${sondage.id}`)
			.setEmoji("2️⃣")
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(`sondageCmd-edit-${sondage.id}`)
			.setEmoji("✏️")
			.setStyle(ButtonStyle.Danger)
	)

	// Récupérer les valeurs de chaque options
	var choix1 = parseInt(sondage.choix_vote1) // Nombre de votes pour l'option 1
	var choix2 = parseInt(sondage.choix_vote2) // Nombre de votes pour l'option 2
	var choix1_percent = Math.round((100 * choix1) / (choix1 + choix2)) || 0 // Pourcentage de votes pour l'option 1
	var choix2_percent = Math.round((100 * choix2) / (choix1 + choix2)) || 0 // Pourcentage de votes pour l'option 2

	// Déterminer un trait selon le nombre de % de vote
	var trait = "▬"
	var trait1 = trait.repeat(Math.round((100 * choix1) / (choix1 + choix2)) / 6)
	var trait2 = trait.repeat(Math.round((100 * choix2) / (choix1 + choix2)) / 6)

	// Créer l'embed
	var embed = new EmbedBuilder()
		.setTitle(sondage.title)
		.setDescription(reason == "dm" ? `Résultats finaux ! Votre sondage s'est terminé ${time(new Date(), "R")}` : reason == "end" ? `Résultats finaux ! Ce sondage s'est terminé ${time(new Date(), "R")}` : `Le sondage se terminera ${sondage.timetype == "indef" ? "quand son créateur l'aura décidé." : `le ${sondage.timeString} (${sondage.relative})`}`)
		.addFields([
			{ name: `1️⃣ ${sondage.option1}`, value: `${choix1} vote${choix1 > 1 ? "s" : ""} (${choix1_percent}%)${trait1.length ? ` | ${trait1}` : ""}` },
			{ name: `2️⃣ ${sondage.option2}`, value: `${choix2} vote${choix2 > 1 ? "s" : ""} (${choix2_percent}%)${trait2.length ? ` | ${trait2}` : ""}` },
			{ name: "Participants", value: `${choix1 + choix2} vote${choix1 + choix2 > 1 ? "s" : ""}` }
		])
		.setColor(bacheroFunctions.colors.primary)
	if (reason != "dm") embed.setAuthor({ name: sondage.username, iconURL: sondage.authorPdp })
	if (!reason) embed.setFooter({ text: "Vous pourrez changer votre vote, mais vous ne pourrez pas le retirer • L'auteur ne sait pas qui participe" })

	// Retourner l'embed et les boutons
	var toReturn = { embeds: [embed], components: [], content: "" }
	if (!reason) toReturn.components = [row]
	return toReturn
}

// Fonction pour terminer un sondage
async function endSondage(sondage) {
	// Date actuelle
	var date = new Date()

	// On modifie la date de fin du sondage
	sondage.timeString = time(date)
	sondage.relative = time(date, "R")

	// Obtenir le client du bot
	if(!botClient) botClient = bacheroFunctions.botClient.get()

	// Faire un embed et l'envoyer au gars
	var embed = generateEmbed(sondage, "dm")
	await botClient.users.fetch(sondage.userId).then(async user => {
		await user.send(embed).catch(err => {})
	}).catch(err => {})

	// Supprimer le sondage de la base de données
	await bacheroFunctions.database.delete(database, `sondage-${sondage.id}`)

	// On obtient le message du sondage
	var sondageMessage
	try {
		var channel = await botClient.channels.cache.get(sondage.channelId).catch(err => {})
		sondageMessage = await channel.messages.fetch(sondage.messageId).catch(err => {})
	} catch (err) {}

	// On génère un autre embed
	var embed = generateEmbed(sondage, "end")
	try {
		await sondageMessage.edit(embed).catch(err => {})
	} catch (err) {}
}

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("sondage")
		.setDescription("Créer un sondage")
		.setDMPermission(false)
		.addStringOption(option => option
			.setName("question")
			.setDescription("Titre / Question")
			.setMaxLength(256)
			.setRequired(true))
		.addStringOption(option => option
			.setName("option1")
			.setDescription("Premier choix d'option")
			.setMaxLength(200)
			.setRequired(true))
		.addStringOption(option => option
			.setName("option2")
			.setDescription("Deuxième choix d'option")
			.setMaxLength(200)
			.setRequired(true))
		.addIntegerOption(option => option.setName("duration")
			.setDescription("Dans combien de temps le sondage se termine ?")
			.setMinValue(1)
			.setMaxValue(9999)
			.setRequired(true))
		.addStringOption(option => option.setName("type")
			.setDescription("Type de durée pour celle entrée précédemment")
			.setChoices(
				{ name: "Seconde", value: "sec" },
				{ name: "Minute", value: "min" },
				{ name: "Heure", value: "hour" },
				{ name: "Jour", value: "day" },
				{ name: "Semaine", value: "week" },
				{ name: "Mois", value: "month" },
				{ name: "Se termine manuellement", value: "indef" }
			)
			.setRequired(true)),

	// Quand le bot est démarré
	async getClient(client) {
		// On garde le client
		if (!botClient) botClient = client

		// Vérifier toute les deux secondes qu'un sondage est terminé
		setInterval(async () => {
			(await runningPolls()).forEach(async sondage => {
				// Si le sondage devrait être terminé, on le termine
				if (sondage.timetype != "indef" && new Date(sondage.endDate).getTime() <= Date.now()) await endSondage(sondage)
			})
		}, 2000)
	},

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le bouton
	async interactionListener(listener) {
		listener.on("button", async (interaction) => {
			// On permet que certains ids de boutons
			if (!interaction.customId.startsWith("sondageCmd-one-") && !interaction.customId.startsWith("sondageCmd-two-") && !interaction.customId.startsWith("sondageCmd-edit-") && !interaction.customId.startsWith("sondageCmd-editQuestion-") && !interaction.customId.startsWith("sondageCmd-editOption-") && !interaction.customId.startsWith("sondageCmd-stop-")) return

			// Obtenir l'identifiant du sondage
			var sondageId = `sondage-${interaction.customId.split("-")[2]}` == "sondage" ? interaction.customId.split("-")[3] : interaction.customId.split("-")[2]

			// Defer l'interaction, le temps de faire quelques actions
			await interaction.deferReply({ ephemeral: true }).catch(err => {})

			// Si l'utilisateur vote
			if (interaction.customId.startsWith("sondageCmd-one-") || interaction.customId.startsWith("sondageCmd-two-")) {
				// Obtenir le sondage dans la base de données
				var sondage = await bacheroFunctions.database.get(database, `sondage-${sondageId}`)
				if (!sondage) return await interaction.editReply({ content: "Ce sondage n'existe plus !", ephemeral: true }).catch(err => {})

				// Choix de l'utilisateur
				var userChoice = interaction.customId.split("-")[1].replace("one", "1").replace("two", "2")

				// Si l'utilisateur a déjà voté
				if (sondage.votants.length && sondage.votants.find(user => user.id == interaction.user.id)) {
					// S'il a voté pour la même option
					if (sondage.votants.find(user => user.id == interaction.user.id).choice == userChoice) return await interaction.editReply({ content: "Vous avez déjà voté pour cette option !", ephemeral: true }).catch(err => {})

					// S'il a voté pour une autre option
					else {
						// Ajouter le vote
						sondage[`choix_vote${sondage.votants.find(user => user.id == interaction.user.id).choice}`] -= 1 // on enlève le vote de l'ancienne option
						sondage[`choix_vote${userChoice}`] += 1 // on ajoute le vote à la nouvelle option
						sondage.votants.find(user => user.id == interaction.user.id).choice = userChoice // on change le choix de l'utilisateur

						// On génère le nouvel embed, et on modifie le message du sondage
						var embed = generateEmbed(sondage)
						await interaction.message.edit(embed).catch(err => {})

						// Répondre à l'utilisateur et modifier le sondage
						await bacheroFunctions.database.set(database, `sondage-${sondageId}`, sondage)
						return await interaction.editReply("Votre vote a été changé !").catch(err => {})
					}
				}

				// On ajoute le vote
				sondage[`choix_vote${userChoice}`] += 1
				sondage.votants.push({ id: interaction.user.id, choice: userChoice })

				// On génère le nouvel embed, et on modifie le message du sondage
				var embed = generateEmbed(sondage)
				await interaction.message.edit(embed).catch(err => {})

				// On répond à l'utilisateur et on modifie le sondage
				await bacheroFunctions.database.set(database, `sondage-${sondageId}`, sondage)
				await interaction.editReply("A voté !").catch(err => {})
			}

			// Si l'utilisateur veut éditer le sondage
			if (interaction.customId.startsWith("sondageCmd-edit-")) {
				// S'il n'est pas autorisé à modifier le sondage on lui dit
				if (!interaction.channel.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageMessages)) {
					return interaction.editReply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission de modifier ce sondage", ephemeral: true }).catch(err => {})
				}

				// Sinon, on propose les modifs possibles
				var embed = new EmbedBuilder()
					.setTitle("Quelle action voulez-vous faire ?")
					.setDescription("1️⃣ : Modifier la question\n2️⃣ : Modifier les options\n✅ : Terminer le sondage")
					.setColor(bacheroFunctions.colors.primary)

				var row = new ActionRowBuilder().addComponents(
					new ButtonBuilder()
						.setCustomId(`sondageCmd-editQuestion-${sondageId}`)
						.setEmoji("1️⃣")
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId(`sondageCmd-editOption-${sondageId}`)
						.setEmoji("2️⃣")
						.setStyle(ButtonStyle.Primary),
					new ButtonBuilder()
						.setCustomId(`sondageCmd-stop-${sondageId}`)
						.setEmoji("✅")
						.setStyle(ButtonStyle.Danger)
				)

				await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true }).catch(err => {})
			}

			// Si l'utilisateur veut modifier la question
			if (interaction.customId.startsWith("sondageCmd-editQuestion-")) {
				// S'il n'est pas autorisé à modifier le sondage on lui dit.
				if (!interaction.channel.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageMessages)) {
					return interaction.editReply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission de modifier ce sondage", ephemeral: true }).catch(err => {})
				}

				// Obtenir le sondage dans la base de données
				var sondage = await bacheroFunctions.database.get(database, `sondage-${sondageId}`)
				if (!sondage) return await interaction.editReply({ content: "Ce sondage n'existe plus !", ephemeral: true }).catch(err => {})

				// Sinon on propose ce qu'il souhaite modifier.
				await interaction.editReply({ content: "Écrivez la nouvelle question dans un message. Dites \"cancel\" pour annuler.", ephemeral: true }).then(() => {
					const collector = interaction.channel.createMessageCollector({ filter: msg => msg.author.id == interaction.user.id })
					collector.on("collect", async msg => {
						// On supprime le message qu'il a envoyé
						msg.delete().catch(err => {})
						collector.stop()

						// S'il annule
						if (msg.content.toLowerCase() == "cancel") return interaction.editReply({ content: "Annulé !", ephemeral: true }).catch(err => {})

						// On modifie le sondage
						sondage.title = msg.content
						await bacheroFunctions.database.set(database, `sondage-${sondageId}`, sondage)

						// Générer un nouvel embed
						var embed = generateEmbed(sondage)

						// On obtient le message du sondage, et on le modifie
						var sondageMessage
						try {
							var channel = await botClient.channels.cache.get(sondage.channelId).catch(err => {})
							sondageMessage = await channel.messages.fetch(sondage.messageId).catch(err => {})
							await sondageMessage.edit(embed).catch(err => {})
						} catch (err) {}

						// Supprimer la réponse de l'interaction
						interaction.deleteReply().catch(err => {})
					})
				}).catch(err => {})
			}

			// Si l'utilisateur veut modifier les choix de réponses
			if (interaction.customId.startsWith("sondageCmd-editOption-")) {
				// S'il n'est pas autorisé à modifier le sondage on lui dit.
				if (!interaction.channel.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageMessages)) {
					return interaction.editReply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission de modifier ce sondage", ephemeral: true }).catch(err => {})
				}

				// Obtenir le sondage dans la base de données
				var sondage = await bacheroFunctions.database.get(database, `sondage-${sondageId}`)
				if (!sondage) return await interaction.editReply({ content: "Ce sondage n'existe plus !", ephemeral: true }).catch(err => {})

				// Sinon on propose ce qu'il souhaite modifier.
				await interaction.editReply({ content: "Écrivez les choix dans un message, en les séparant par un \"|\". Dites \"cancel\" pour annuler.", ephemeral: true }).then(() => {
					const collector = interaction.channel.createMessageCollector({ filter: msg => msg.author.id == interaction.user.id })
					collector.on("collect", async msg => {
						// On supprime le message qu'il a envoyé
						msg.delete().catch(err => {})
						collector.stop()

						// S'il annule
						if(msg.content.toLowerCase() == "cancel") return interaction.editReply({ content: "Annulé !", ephemeral: true }).catch(err => {})

						// On obtient les deux options
						var options = msg.content.split("|").map(op => op.trim())
						if (options?.length) options = options.slice(0, 2)

						// On modifie le sondage
						if (options?.[0]) sondage.option1 = options[0]
						if (options?.[1]) sondage.option2 = options[1]
						await bacheroFunctions.database.set(database, `sondage-${sondageId}`, sondage)

						// Générer un nouvel embed
						var embed = generateEmbed(sondage)

						// On obtient le message du sondage, et on le modifie
						var sondageMessage
						try {
							var channel = await botClient.channels.cache.get(sondage.channelId)
							sondageMessage = await channel.messages.fetch(sondage.messageId)
							await sondageMessage.edit(embed).catch(err => {})
						} catch (err) { }

						// Supprimer la réponse de l'interaction
						interaction.deleteReply().catch(err => {})
					})
				})
			}

			// Si l'utilisateur veut arrêter le sondage
			if (interaction.customId.startsWith("sondageCmd-stop-")) {
				// S'il n'est pas autorisé à modifier le sondage on lui dit
				if (!interaction.channel.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageMessages)) {
					return interaction.editReply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission d'arrêter ce sondage", ephemeral: true }).catch(err => {})
				}

				// Obtenir le sondage dans la base de données
				var sondage = await bacheroFunctions.database.get(database, `sondage-${sondageId}`)
				if (!sondage) return await interaction.editReply({ content: "Ce sondage n'existe plus !", ephemeral: true }).catch(err => {})

				// On termine le sondage
				await endSondage(sondage)
				return interaction.editReply({ content: "✅ Sondage terminé ! Les utilisateurs ne pourront plus voter à partir de maintenant.", ephemeral: true }).catch(err => {})
			}
		})
	},

	async execute(interaction){
		// Defer l'interaction, le temps de faire quelques actions
		await interaction.deferReply({ ephemeral: true }).catch(err => {})

		// Déterminer la date de fin du sondage, selon les arguments de l'utilisateur
		const date = new Date()

		// En fonction du types
		if (interaction.options.getString("type") == "sec") date.setSeconds(date.getSeconds() + interaction.options.getInteger("duration"))
		if (interaction.options.getString("type") == "min") date.setMinutes(date.getMinutes() + interaction.options.getInteger("duration"))
		if (interaction.options.getString("type") == "hour") date.setHours(date.getHours() + interaction.options.getInteger("duration"))
		if (interaction.options.getString("type") == "day") date.setDate(date.getDate() + interaction.options.getInteger("duration"))
		if (interaction.options.getString("type") == "week") date.setMonth(date.getDate() + interaction.options.getInteger("duration"))
		if (interaction.options.getString("type") == "month") date.setMonth(date.getMonth() + interaction.options.getInteger("duration"))
		if (interaction.options.getString("type") == "indef") date.setFullYear(9999)

		// On fait deux strings avec la date de fin dans différents formats
		const timeString = time(date) // JJ/MM/AAAA HH:MM:SS
		const relative = time(date, "R") // Dans (…) ou (il y a …)

		// Récupérer d'autres arguments de l'utilisateur
		var title = interaction.options.getString("question")
		var option1 = interaction.options.getString("option1")
		var option2 = interaction.options.getString("option2")

		// Créer le sondage dans la base de données
		var sondageId = Date.now()
		var sondage = {
			id: sondageId,
			title: title,
			option1: option1,
			option2: option2,
			choix_vote1: 0, // Nombre de votes pour l'option, sera à 0 au début
			choix_vote2: 0,
			votants: [], // Liste des votants
			timeString: timeString,
			relative: relative,
			timetype: interaction.options.getString("type"),
			userId: interaction.user.id,
			username: interaction.user.username,
			authorPdp: interaction.user.displayAvatarURL({ dynamic: true }),
			endDate: date.getTime(),
			channelId: interaction.channelId
		}

		// Obtenir le client du bot
		if (!botClient) botClient = bacheroFunctions.botClient.get()

		// On génère l'embed et les boutons
		var embed = generateEmbed(sondage)

		// On envoie l'embed dans le salon
		try {
			// Envoyer l'embed
			var isFailed = false
			var msg = await botClient.channels.cache.get(interaction.channelId).send(embed).catch(err => {
				isFailed = true
				return bacheroFunctions.report.createAndReply("envoi du sondage", err, {}, interaction)
			})

			// Ajouter l'identifiant du message au sondage, et l'enregistrer dans la BDD
			sondage.messageId = msg.id
			await bacheroFunctions.database.set(database, `sondage-${sondageId}`, sondage)

			// Répondre à l'interaction
			if (interaction.sourceType !== "textCommand" && !isFailed) interaction.editReply({ content: "Le sondage a été envoyé !" }).catch(err => {})
		} catch (err) {
			return await bacheroFunctions.report.createAndReply("envoi du message", err, {}, interaction)
		}

		// Si c'est une commande texte, tenter de supprimer le message d'invocation
		if (interaction.sourceType == "textCommand") {
			try { interaction.delete().catch(err => {}) } catch (err) { }
		}
	}
}