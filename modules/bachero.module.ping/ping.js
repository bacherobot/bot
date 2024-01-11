const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js")
const { database, config, cooldown, colors } = require("../../functions")
const db = database.getDatabase("bachero.module.ping")
const showPingFromDatabase = config.getValue("bachero.module.ping", "showPingFromDatabase")
var botName = config.getValue("bachero", "botName")

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("ping")
		.setDescription(`Affiche le temps de latence de ${botName}`),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Vérifier si l'utilisateur est limité, et si c'est pas le cas, le limiter
		var checkAndReply = await cooldown.checkAndReply(interaction, "pingCommandUsage")
		if(checkAndReply) return; else await cooldown.set("pingCommandUsage", interaction.user.id, 1000)

		// Obtenir la date actuelle
		var date = Date.now()

		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Récupérer le temps pris
		var discordLatency = new Date().getTime() - date

		// Dans la base de données, obtenir l'historique de ping (qui permettra donc d'obtenir le ping de la BDD en lecture)
		date = new Date().getTime()
		var latencyHistory = await database.get(db, "pingHistory") || {}
		var databaseLatency_read = new Date().getTime() - date

		// Obtenir la valeur + clé la plus récente par rapport à la date
		var latencyHistory_keys = Object.keys(latencyHistory)
		var latencyHistory_key = latencyHistory_keys[latencyHistory_keys.length - 1]
		var latencyHistory_value = latencyHistory[latencyHistory_key]

		// Définir dans la base de données le ping Discord (et obtenir le ping de la BDD en écriture)
		date = new Date().getTime()
		latencyHistory[Date.now()] = discordLatency
		if(latencyHistory_keys.length > 5) latencyHistory = Object.fromEntries(latencyHistory_keys.slice(latencyHistory_keys.length - 5).map(key => [key, latencyHistory[key]]))
		await database.set(db, "pingHistory", latencyHistory)
		var databaseLatency_write = new Date().getTime() - date

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle("Pong 🏓")
			.setDescription(`Discord : \`${discordLatency}\` ms ${latencyHistory_value ? `(\`${latencyHistory_value}\` ms <t:${parseInt(latencyHistory_key / 1000)}:R>)` : ""}${showPingFromDatabase == true ? `\nBase de données :\nㅤ  • Lecture : \`${databaseLatency_read}\` ms\nㅤ  • Ecriture : \`${databaseLatency_write}\` ms` : ""}`)
			.setColor(colors.primary)

		// Créé un bouton
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(`pingInfo-${date}`)
			.setLabel("En savoir plus")
			.setStyle(ButtonStyle.Primary),)

		// Quand quelqu'un clique sur le bouton
		const filter = i => i.customId == `pingInfo-${date}`
		const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 999999 })
		collector.on("collect", async i => {
			// Arrêter le collecteur
			collector.stop()

			// Mettre à jour l'embed
			embed.setDescription(`${embed.data.description}\n\n> Pour obtenir la latence Discord, ${botName} calcule le temps qu'il prend pour envoyer et recevoir des réponses, ceci inclut le temps que Discord prend à s'exécuter.`)
			i.update({ embeds: [embed], components: [] }).catch(err => {})
		})

		// Répondre à l'interaction
		interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}
