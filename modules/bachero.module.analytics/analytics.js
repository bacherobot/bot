const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("internalBachero.stats")
const disableTextCommand = bacheroFunctions.config.getValue("bachero", "disableTextCommand")

// Cache
var cache
if(global.analyticsCache) cache = global.analyticsCache
else {
	const NodeCache = require("node-cache")
	cache = new NodeCache()
	global.analyticsCache = cache
}

// Liste des mois
var months = {
	0: "Janvier",
	1: "Février",
	2: "Mars",
	3: "Avril",
	4: "Mai",
	5: "Juin",
	6: "Juillet",
	7: "Août",
	8: "Septembre",
	9: "Octobre",
	10: "Novembre",
	11: "Décembre"
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("analytics")
		.setDescription("Affiche des données sur l'utilisation des commandes")
		.setDMPermission(false),

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le bouton
	async interactionListener(listener){
		listener.on("button", async (interaction) => {
			// Vérifier l'identifiant du bouton
			if(interaction.customId != "analytics-safety") return

			// Répondre avec un embed
			var embed = new EmbedBuilder()
				.setTitle("Confidentialité des données avec le suivi d'utilisation")
				.setDescription(`Nous tenons à la vie privée de nos utilisateurs, nous avons donc mis en place certaines mesures listées ici :\n
					• Aucune donnée ne peut permettre d'identifier un utilisateur.
					• Les données sont enregistrées par serveur, et non par utilisateur.
					• À la fin de chaque mois, les nouvelles statistiques remplacent définitivement les précédentes.
					• Seules les données d'utilisation des commandes sont enregistrées.
					• Les informations contenues dans le message envoyé via la commande \`/analytics\` sont les seules informations que nous possédons.`)
				.setColor(bacheroFunctions.colors.primary)
			return interaction.reply({ embeds: [embed], ephemeral: true }).catch(err => {})
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// On tente de récupérer les données en cache
		var cachedData = cache.get(interaction.guild.id)

		// Si on a des données en cache
		if(cachedData?.embed) return interaction.reply({ embeds: [cachedData.embed] })
		if(cachedData?.message) return interaction.reply({ content: cachedData.message })

		// Mettre en cache le fait qu'on calcule les données
		cache.set(interaction.guild.id, { message: "Les données pour ce serveur sont en train d'être calculées... Réessayez dans quelques instants." }, 300)

		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// On commence à enregistrer le temps pris pour calculer les données
		var startTime = Date.now()

		// Récupérer les données
		var analyticsData = await bacheroFunctions.database.get(database, `commands-${interaction.guild.id}`)

		// Si on a pas de données
		if(!analyticsData){
			cache.set(interaction.guild.id, { message: "Aucune donnée n'est actuellement disponible pour ce serveur." }, 60)
			return interaction.editReply({ content: "Aucune donnée n'est actuellement disponible pour ce serveur." })
		}

		// Créer l'embed
		var embed = new EmbedBuilder()
			.setTitle("Données d'utilisation des commandes")
			.setColor(bacheroFunctions.colors.primary)

		// Trier pour avoir les six commandes les plus utilisées
		var sortedData = Object.entries(analyticsData.commands).sort((a, b) => { return b[1]?.totalCount - a[1]?.totalCount }).slice(0, 6)
		if(!sortedData.length) return interaction.editReply({ content: "Aucune donnée n'est actuellement disponible pour ce serveur." })

		// Passer par dessus toutes les commandes
		sortedData.forEach((command, index) => {
			// Ajouter les lignes nécessaires
			var lines = []
			if(!disableTextCommand) lines.push(`**Utilisations par méthodes**\n${Object.entries(command[1].method).map(method => { return `ㅤ  •  ${method[0].replace("slash", "Commande slash").replace("text", "Commande texte")} : ${method[1]}` }).join("\n")}\n`)
			lines.push(`**Utilisations par périodes**\n${Object.entries(command[1].periods).map(period => { return `ㅤ  •  ${period[0].replace("morning", "En matinée").replace("afternoon", "En après-midi").replace("evening", "En soirée").replace("night", "Pendant la nuit")} : ${period[1]}` }).join("\n")}\n`)
			lines.push(`**Utilisations par jours**\n${Object.entries(command[1].weekday).map(day => { return `ㅤ  •  ${day[0].replace("monday", "Lundi").replace("tuesday", "Mardi").replace("wednesday", "Mercredi").replace("thursday", "Jeudi").replace("friday", "Vendredi").replace("saturday", "Samedi").replace("sunday", "Dimanche")} : ${day[1]}` }).join("\n")}\n`)
			if(Object.entries(command[1].subCommands).length) lines.push(`**Utilisation des sous commandes**\n${Object.entries(command[1].subCommands).map(subCommand => { return `ㅤ  •  ${subCommand[0]} : ${subCommand[1]}` }).join("\n")}\n`)
			lines.push(`**Utilisations totales :** ${command[1].totalCount}`)
			if(command[1].lastExecution) lines.push(`**Dernière exécution :** <t:${Math.round(command[1].lastExecution / 1000)}:R>\n`)

			// Ajouter le champ
			embed.addFields({
				name: `${index + 1}. \`${command[0]}\``,
				value: lines.join("\n").replace(/\t/g, "").trim(),
				inline: true
			})
		})

		// On détermine le temps pris pour calculer les données en millisecondes
		var endTime = Date.now()
		var timeTaken = endTime - startTime
		embed.setFooter({ text: `Données pour le mois de ${months[analyticsData.month]}` })

		// Mettre en cache les données
		cache.set(interaction.guild.id, { embed: embed }, timeTaken > 10000 ? 180 : 25)

		// Créé un bouton d'explication
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId("analytics-safety")
			.setLabel("Comment votre confidentialité reste assurée")
			.setStyle(ButtonStyle.Secondary),)

		// Répondre à l'interaction
		interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}