const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js')
const fetch = require('node-fetch')
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('bachero.module.ping')
const showPingFromDatabase = bacheroFunctions.config.getValue('bachero.module.ping', 'showPingFromDatabase')
var botName = bacheroFunctions.config.getValue('bachero', 'botName')

// Fonction pour obtenir l'historique de latence
var latencyHistory = {}
async function getLatencyHistory(clientId){
	// Si on a déjà enregistrer dans le cache y'a moins de 5 heures, on retourne
	if(latencyHistory.content && latencyHistory.lastFetched && latencyHistory.lastFetched > Date.now() - 1000 * 60 * 60 * 5) return latencyHistory.content

	// Sinon on fetch, enregistre dans le cache, et retourne
	latencyHistory.content = await fetch(`https://api.elwatch.fr/api/status/${clientId}`).then(res => res.json())
	latencyHistory.lastFetched = new Date()
	latencyHistory.content = latencyHistory?.content?.info?.pingHistory || latencyHistory.content
	return latencyHistory.content
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('ping')
		.setDescription(`Affiche le temps de latence de ${botName}`),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Vérifier si l'utilisateur est limité, et si c'est pas le cas, le limiter
		var checkAndReply = await bacheroFunctions.cooldown.checkAndReply(interaction, 'pingCommandUsage')
		if(checkAndReply) return; else await bacheroFunctions.cooldown.set('pingCommandUsage', interaction.user.id, 1000)

		// Obtenir la date actuelle
		var date = Date.now()

		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return 'stop' }) == 'stop') return

		// Récupérer le temps pris
		var discordLatency = new Date().getTime() - date

		// Dans la base de données, obtenir l'historique de ping (qui permettra donc d'obtenir le ping de la BDD en lecture)
		date = new Date().getTime()
		var latencyHistory = await bacheroFunctions.database.get(database, 'pingHistory') || {}
		var databaseLatency_read = new Date().getTime() - date

		// Obtenir la valeur + clé la plus récente par rapport à la date
		var latencyHistory_keys = Object.keys(latencyHistory)
		var latencyHistory_key = latencyHistory_keys[latencyHistory_keys.length - 1]
		var latencyHistory_value = latencyHistory[latencyHistory_key]

		// Définir dans la base de données le ping Discord (et obtenir le ping de la BDD en écriture)
		date = new Date().getTime()
		latencyHistory[Date.now()] = discordLatency
		if(latencyHistory_keys.length > 5) latencyHistory = Object.fromEntries(latencyHistory_keys.slice(latencyHistory_keys.length - 5).map(key => [key, latencyHistory[key]]))
		await bacheroFunctions.database.set(database, 'pingHistory', latencyHistory)
		var databaseLatency_write = new Date().getTime() - date

		// Créer un embed
		var embed = new EmbedBuilder()
		.setTitle('Pong 🏓')
		.setDescription(`Discord : \`${discordLatency}\` ms ${latencyHistory_value ? `(\`${latencyHistory_value}\` ms <t:${parseInt(latencyHistory_key / 1000)}:R>)` : ''}${showPingFromDatabase == true ? `\nBase de données :\nㅤ  • Lecture : \`${databaseLatency_read}\` ms\nㅤ  • Ecriture : \`${databaseLatency_write}\` ms` : ''}`)
		.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))

		// Créé un bouton
		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
			.setCustomId(`pingInfo-${date}`)
			.setLabel('En savoir plus')
			.setStyle(ButtonStyle.Primary),
		)

		// Quand quelqu'un clique sur le bouton
		const filter = i => i.customId == `pingInfo-${date}`
		const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 999999 })
		collector.on('collect', async i => {
			// Arrêter le collecteur
			collector.stop()

			// Obtenir des infos via l'API d'ElWatch
			var pingHistory = []
			if(bacheroFunctions.config.getValue('bachero.module.ping', 'monitoredByElwatch') == true){
				var elwatchStatus = await getLatencyHistory(interaction.client.user.id || bacheroFunctions.botClient.get().user.id)
				if(elwatchStatus['6']) pingHistory.push(`6h : \`${elwatchStatus['6']}\` ms`)
				if(elwatchStatus['12']) pingHistory.push(`12h : \`${elwatchStatus['12']}\` ms`)
				if(elwatchStatus['18']) pingHistory.push(`18h : \`${elwatchStatus['18']}\` ms`)
				if(elwatchStatus['23']) pingHistory.push(`23h : \`${elwatchStatus['23']}\` ms`)
				embed.data.description += `\nHistorique Discord sur plusieurs heures :\n${pingHistory.map(a => `ㅤ  • ${a}`).join('\n')}`
			}

			// Mettre à jour l'embed
			embed.setDescription(`${embed.data.description}\n\n> Pour obtenir la latence Discord, ${botName} calcule le temps qu'il prend pour envoyer et recevoir des réponses, ceci inclut le temps que Discord prend à s'exécuter.${bacheroFunctions.config.getValue('bachero.module.ping', 'monitoredByElwatch') ? `\n\n> Également, ce bot est surveillé par ElWatch et supporte la mesure du ping, vous pouvez [cliquer ici](https://elwatch.fr/status/${interaction.client.user.id || bacheroFunctions.botClient.get().user.id}) pour obtenir la latence obtenue par un tiers.` : ''}`)
			i.update({ embeds: [embed], components: [] }).catch(err => {})
		})

		// Répondre à l'interaction
		interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}
