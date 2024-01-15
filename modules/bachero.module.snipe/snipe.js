const { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, ButtonBuilder, ActionRowBuilder, escapeMarkdown } = require("discord.js")
const fetch = require("node-fetch")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.snipe")
const hastebinUrl = process.env.HASTEBIN_URL || "https://haste.johanstick.fr"
const hastebinAPI = `${hastebinUrl}/documents`
const hastebinTokenRequired = hastebinUrl == "https://hastebin.com"

// Cache
var cache
if(global.snipeGuildStatusCache) cache = global.snipeGuildStatusCache
else {
	const NodeCache = require("node-cache")
	cache = new NodeCache()
	global.snipeGuildStatusCache = cache
}

// Client Discord
var client

// Fonction pour ajouter à la base de données un message supprimé/modifié
async function addToDb(message, newMessage){
	// Vérifier qu'on soit dans un salon d'un serveur
	if(!message.guild) return

	// Si le message est partiel, on ne fait rien (ptet que discord.js a pas pu le caché)
	if(message.partial || (newMessage && newMessage.partial)) return

	// Ignorer les messages datant de plus de 3 jours et ceux des bots
	if(message.author.bot || Date.now() - message.createdTimestamp > 1000 * 60 * 60 * 24 * 3) return

	// Obtenir le status du serveur dans le cache
	var guildStatus = cache.get(message.guildId)

	// Si la fonctionnalité est désactivée, on ne fait rien
	if(guildStatus && !guildStatus?.enabled) return
	else if(!guildStatus){
		var dbStatus = await bacheroFunctions.database.get(database, `enabled-${message.guildId}`)
		cache.set(message.guildId, { enabled: dbStatus }, 1000 * 90) // on enregistre pendant 90 secondes
		if(!dbStatus) return
	}

	// Obtenir la liste des attachements
	var attachments = []
	for(var attachment of message.attachments.values()){
		attachments.push({ url: attachment.url, filename: attachment.name })
	}

	// Enregistrer le message
	if(!client.snipes) client.snipes = new Map()
	var snipes = client.snipes.get(message.guildId) || []
	if(newMessage) snipes.push({
		type: "edit",
		timestamp: Date.now(),
		oldContent: message.content, newContent: newMessage.content,
		authorId: message.author.id, authorTag: message.author.discriminator == "0" ? escapeMarkdown(message.author.username) : escapeMarkdown(message.author.tag),
	})
	else snipes.push({
		type: "delete",
		timestamp: Date.now(),
		content: message.content, attachments: attachments,
		authorId: message.author.id, authorTag: message.author.discriminator == "0" ? escapeMarkdown(message.author.username) : escapeMarkdown(message.author.tag),
	})

	// Mettre les snipes dans un ordre pour que les plus récents soient en haut
	snipes.sort((a, b) => b.timestamp - a.timestamp)

	// Ne garder que les 500 derniers snipes, puis les enregistrer
	if(snipes.length > 500) snipes = snipes.slice(0, 500)
	client.snipes.set(message.guildId, snipes)
}

// Exporter une fonction
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("snipe")
		.setDescription("Affiche les dernières modifications et suppressions de messages")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.setDMPermission(false)
		.addUserOption(option => option.setName("de")
			.setDescription("Filtrer les messages d'un utilisateur")
			.setRequired(false))
		.addStringOption(option => option.setName("contient")
			.setDescription("Filtrer les messages qui contiennent un élément")
			.setChoices(
				{ name: "Lien", value: "link" },
				{ name: "Attachement", value: "attachment" }
			)
			.setRequired(false))
		.addStringOption(option => option.setName("query")
			.setDescription("Filtrer les messages qui contiennent un certain texte")
			.setRequired(false)),

	// Obtenir le client
	getClient(_client){
		// Enregistrer dans le cache le client
		client = _client

		// Tout les jours, on supprime les données plus vieilles que 24 heures
		setInterval(async () => {
			// Log debug
			bacheroFunctions.showDebug("(Vérif quotidienne) Suppression des snipes trop vieux")

			// Si on a 0 snipes, on annule
			if(!client.snipes || client.snipes.size == 0) return bacheroFunctions.showDebug("(Vérif quotidienne) Aucun snipe à supprimer")
			else bacheroFunctions.showDebug("(Vérif quotidienne) Des snipes vont être vérifiés")

			// Obtenir la liste des snipes
			var snipes = client.snipes.entries()
			for(var [guildId, snipes] of snipes){
				// Supprimer les snipes trop vieux
				snipes = snipes.filter(snipe => Date.now() - snipe.timestamp < 1000 * 60 * 60 * 24)
				client.snipes.set(guildId, snipes)
			}

			// Supprimer les guildes sans snipes
			for(var guildId of client.snipes.keys()){
				if(client.snipes.get(guildId).length == 0) client.snipes.delete(guildId)
			}
		}, 1000 * 60 * 60 * 24)

		// Détecter les messages supprimés, ou modifiés
		client.on("messageDelete", async message => addToDb(message))
		client.on("messageUpdate", async (oldMessage, newMessage) => addToDb(oldMessage, newMessage))
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Vérifier si la fonctionnalité est activée
		bacheroFunctions.showDebug(`Vérif. que la fonctionnalité soit activée (enabled-${interaction.guild.id})`)
		var isEnabled = await bacheroFunctions.database.get(database, `enabled-${interaction.guild.id}`)
		if(!isEnabled) return interaction.reply({ content: "La fonctionnalité Snipe est désactivée sur ce serveur.", ephemeral: true }).catch(err => {})

		// Mettre la réponse en defer
		bacheroFunctions.showDebug("Défer. la réponse")
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir les derniers snipes
		bacheroFunctions.showDebug("Obtenir les derniers snipes")
		var snipes = interaction.client?.snipes?.get(interaction.guildId) || []
		if(!snipes?.length) return interaction.editReply({ content: "Aucun message n'a été supprimé ou modifié récemment..." }).catch(err => {})

		// Obtenir les options de filtres
		var user = await interaction.options.getUser("de")
		var contains = await interaction.options.getString("contient")
		var query = await interaction.options.getString("query")

		// Filtrer et trier les snipes
		bacheroFunctions.showDebug(`Filtrer et trier ${snipes.length} snipes`)
		snipes = snipes.filter(snipe => {
			// Si on a un utilisateur, on ne garde que les snipes de cet utilisateur
			if(user && snipe.authorId != user.id) return false

			// Si on a un type de filtre, on ne garde que les snipes qui correspondent
			snipe.globalContent = snipe.content || snipe.oldContent + snipe.newContent || ""
			if(contains == "link" && !snipe.globalContent?.includes("http://") && !snipe.globalContent?.includes("https://")) return false
			if(contains == "attachment" && !snipe.attachments?.length) return false

			// Si on a une requête, on ne garde que les snipes qui correspondent
			if(query && !snipe.globalContent?.toLowerCase()?.includes(query.toLowerCase())) return false

			// Sinon, on garde le snipe
			return true
		}).sort((a, b) => b.timestamp - a.timestamp)
		bacheroFunctions.showDebug(`Il reste ${snipes.length} snipes`)

		// Si on a aucun snipe, on annule
		if(!snipes?.length) return interaction.editReply({ content: "Aucun snipe ne correspond à ces critères de recherche..." }).catch(err => {})

		// Déterminer si certains snipes sont trop longs
		var isSomeSnipeTooLong = false

		// Lister les champs (fields) de l'embed
		bacheroFunctions.showDebug("Générations des champs dans l'embed")
		var fields = snipes.slice(0, 13).map(snipe => {
			// Obtenir le contenu
			var content = snipe.type == "edit" ? `**Avant :** ${snipe.oldContent}\n**Après :** ${snipe.newContent}` : snipe.content

			// Obtenir les attachements
			var attachments = snipe?.attachments?.map(attachment => { return `[${attachment.filename}](${attachment.url})` })?.join("\n") || ""

			// Si le contenu ainsi que les attachements sont trop longs, on n'affiche que ce qu'on peut
			if(`${attachments}\n${content}`.trim().length > 1024){
				isSomeSnipeTooLong = true
				content = `${`${attachments}\n${content}`.trim().match(/.{1,1021}/g)[0]}...`
			} else content = `${attachments}\n${content}`.trim()

			// Retourner le champ
			return {
				name: `${snipe.authorTag} *(ID: ${snipe.authorId})* — ${snipe.type == "delete" ? "suppression" : snipe.type == "edit" ? "modification" : snipe.type} — <t:${Math.round(new Date(snipe.timestamp).getTime() / 1000)}:f>`,
				value: content,
			}
		})

		// Créer un embed
		bacheroFunctions.showDebug("Création de l'embed")
		var embed = new EmbedBuilder()
			.setTitle("Fonctionnalité Snipe")
			.addFields(fields)
			.setDescription(`Affichage ${snipes.length == 1 ? "de la dernière action sur ce serveur" : `des **${snipes.slice(0, 13).length}** dernières actions sur ce serveur`}.${isSomeSnipeTooLong ? "\n\n⚠️ Certains snipes sont trop longs pour être affichés ici : ils ont été tronqués..." : ""}`)
			.setColor(bacheroFunctions.colors.primary)

		// Ajouter un bouton pour accéder au haste
		if(isSomeSnipeTooLong && ((hastebinTokenRequired && process.env.HASTEBIN_TOKEN) || !hastebinTokenRequired)) var row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setURL(hastebinAPI)
			.setLabel("Afficher intégralement")
			.setStyle(ButtonStyle.Link)
			.setDisabled(true))

		// Répondre à l'interaction
		bacheroFunctions.showDebug("Répondre à l'interaction")
		if(row) await interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
		else await interaction.editReply({ embeds: [embed] }).catch(err => {})

		// Si certains snipes sont trop longs, on crée un haste
		if(isSomeSnipeTooLong && ((hastebinTokenRequired && process.env.HASTEBIN_TOKEN) || !hastebinTokenRequired)){
			// Log debug
			bacheroFunctions.showDebug("Les snipes sont trop longs, on crée un haste")

			// Générer le contenu du haste
			var content = snipes.slice(0, 13).map(snipe => {
				var content = snipe.type == "edit" ? `**Avant :** ${snipe.oldContent}\n**Après :** ${snipe.newContent}` : snipe.content
				var attachments = snipe?.attachments?.map(attachment => { return `- ${attachment.filename} : ${attachment.url}` })?.join("\n") || ""
				content = `${attachments}\n${content}`.trim()
				return `${snipe.authorTag} (ID: ${snipe.authorId}) — ${snipe.type == "delete" ? "suppression" : snipe.type == "edit" ? "modification" : snipe.type} — ${global.intlFormatter.format(new Date(snipe.timestamp))}\n\n${content}`
			}).join("\n\n\n\n\n")

			// Obtenir les informations de l'utilisateur
			bacheroFunctions.showDebug("Envoi de la requête à Hastebin")
			var haste = await fetch(hastebinAPI, {
				method: "POST",
				body: content,
				headers: {
					"Authorization": `Bearer ${process.env.HASTEBIN_TOKEN}`,
					"Content-Type": "text/plain",
					"User-Agent": "BacheroBot (+https://github.com/bacherobot/bot)"
				}
			}).then(res => res.json()).catch(err => { return { error: true, message: err } })

			// Si on a une erreur
			if(haste?.message || !haste?.key) return await bacheroFunctions.report.createAndReply("création d'un haste", haste?.message || haste, { url: hastebinAPI, body: content }, interaction)

			// Modifier le bouton dans l'interaction
			bacheroFunctions.showDebug("Modifier le bouton dans l'interaction, puis mise à jour")
			row.components[0].setURL(`${hastebinUrl == "https://hastebin.com" ? `https://hastebin.com/share/${haste?.key}` : `${hastebinUrl}/${haste?.key}`}`).setDisabled(false)
			await interaction.editReply({ components: [row] }).catch(err => {})
		}
	}
}