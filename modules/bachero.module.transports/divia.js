const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js")
const Fuse = require("fuse.js")
const bacheroFunctions = require("../../functions")
const escape = require("markdown-escape")

// Ids d'interactions
var interactionIds = []

// Cache des arrêts d'une ligne
var cache_stops = {}

// Liste de tous les transports et services, on les obtiendras en entiers plus tard
var transports
var services

// Fonction qui nous sert à obtenir un JWT Token pour récupérer les horaires de passage
var jwtToken
var expireJwtTokenTimeout
async function getJwtToken(){
	// On obtient le token (note: les identifiants c'est vrm ceux dans l'appli mobile ptdrr, en tt cas quand j'écris ça le 11 août 2023)
	var token = await fetch("https://tim.divia.fr/api/login_check", { method: "POST", body: new URLSearchParams({ _username: "diviapp", _password: "LB72x.26[uShR*u)" }), headers: { "Content-Type": "application/x-www-form-urlencoded" } }).then(r => r.json()).catch(err => { return { fetcherror: err } })
	if(token.fetcherror || !token?.token) return bacheroFunctions.showLog("error", `Problème rencontré lors de l'obtention du JWT Token de Divia "bachero.module.transports" : ${token?.message || JSON.stringify(token)}`, "transports-divia-getJwtToken")

	// On le met en cache
	jwtToken = token.token
	if(expireJwtTokenTimeout) clearTimeout(expireJwtTokenTimeout)
	expireJwtTokenTimeout = setTimeout(() => { jwtToken = null }, 1000 * 60 * 60 * 2) // On le met en cache pour 2 heures

	// On retourne le token
	return jwtToken
}

// Fonction qui nous sert à obtenir la liste des transports et services
async function getList(interaction){
	// On obtient la liste des transports si on ne l'a pas déjà
	if(!transports){
		// Obtenir les infos sur le réseau
		var _transports = await fetch("https://bo-api.divia.fr/api/reseau/type/json/order?channel=web").then(r => r.json()).catch(err => { return { fetcherror: err } })
		if(_transports.fetcherror || !_transports?.reseau?.lignes) return await bacheroFunctions.report.createAndReply("requête vers l'API de Divia (n°1)", _transports.fetcherror || _transports, {}, interaction)

		// Le rendre plus propre
		_transports = _transports.reseau.lignes.map(t => {
			return {
				id: t.id,
				name: t.nom,
				commercialName: t.nom_commercial,
				direction: t.direction,
				type: t.type,
				deleted: t.deleted,
				service: {
					id: t?.service?.id, code: t?.service?.code, name: t?.service?.nom || t?.service?.nom_en, description: t?.service?.description || t?.service?.description_en
				}
			}
		})

		// On supprime les lignes supprimées
		_transports = _transports.filter(t => !t.deleted)

		// On le met en cache
		transports = _transports
	}

	// Si on a pas les services, on les obtient
	if(!services){
		var _services = transports.map(t => t.service).filter((s, i, a) => a.findIndex(s2 => s2.id == s.id) == i)
		services = _services.filter(s => s.id && s.code)
	}

	// On retourne que c'est bon
	return true
}

// Fonction quand on obtient la ligne
async function whenLineObtained(interaction, line, isFromModal){
	// On défère l'interaction pour éviter les erreurs
	if(isFromModal) await interaction.deferReply().catch(err => {})
	else await interaction.deferUpdate().catch(err => {})

	// Si on vient d'un modal, on fait une recherche pour avoir l'id de la ligne
	if(isFromModal){
		// On vérifie qu'on a tout les transports
		if(!transports) await getList(interaction)

		// On essaye d'obtenir la ligne, limiter à 15 résultats
		var search = new Fuse(transports.map(a => { return { name: `${a?.commercialName}${a?.name}`, id: a?.id } }), { keys: ["name"], shouldSort: true, distance: 200, threshold: 0.4, ignoreLocation: true }).search(line)
		if(!search?.[0]?.item?.id) return interaction.editReply({ embeds: [], content: "Je n'ai pas trouvé cet arrêt..." }).catch(err => {})
		search = search.slice(0, 15)

		// Si on a qu'un seul résultat, on l'utilise
		if(search.length == 1) line = search[0].item.id

		// Sinon on demande à l'utilisateur de préciser
		else {
			const row = new ActionRowBuilder().addComponents( // eslint-disable-line
				new StringSelectMenuBuilder()
					.setCustomId("diviaCmd-line")
					.setPlaceholder("Choissisez une ligne")
					.addOptions(search.map(s => {
						return new StringSelectMenuOptionBuilder().setLabel(`${s?.item?.name}`).setValue(s?.item?.id)
					})))
			await interaction.editReply({ embeds: [], components: [row] }).catch(err => {})
			return
		}
	}

	// Obtenir les arrêts sur la ligne
	var stops
	if(cache_stops[line]) stops = cache_stops[line]
	else {
		stops = await fetch(`https://bo-api.divia.fr/api/totemArretsByLigne/ligne/${line}`).then(r => r.json()).catch(err => { return { fetcherror: err } })
		if(stops.fetcherror || !stops?.length) return await bacheroFunctions.report.createAndReply("requête vers l'API de Divia (n°2)", stops.fetcherror || stops, {}, interaction)
		stops = stops.sort((a, b) => a.nom.localeCompare(b.nom)).map(s => { return { id: s.id, name: s.nom } }) // L'API change l'ordre des arrêts parfois
	}

	// Mettre en cache
	cache_stops[line] = stops

	// On obtient les détails complet de la ligne (et non que l'id)
	line = transports.find(t => t.id == line)

	// Si on a plus de 25 arrêts, on demande à l'utilisateur de préciser
	if(stops.length > 25){
		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle(`${stops.length} arrêts trouvés`)
			.setDescription(stops.map(s => `- ${s.name ? s.name : "Inconnu (???)"}`).join("\n"))
			.setColor(bacheroFunctions.colors.primary)

		// Créer le bouton pour choisir via un modal
		var id = Date.now()
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(`diviaCmd-stop-${id}`)
			.setLabel("Choisir un arrêt")
			.setStyle(ButtonStyle.Primary))
		interactionIds.push({ id: id, line: line, stops: stops })
		await interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
	} else {
		var id = Date.now()
		const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
			.setCustomId(`diviaCmd-stop-${id}`)
			.setPlaceholder("Choissisez un arrêt")
			.addOptions(stops.map(s => {
				return new StringSelectMenuOptionBuilder().setLabel(`${s.name ? s.name : "Inconnu (??? signale ce bug stp)"}`).setValue(s?.id?.toString())
			})))
		interactionIds.push({ id: id, line: line, stops: stops })
		await interaction.editReply({ components: [row] }).catch(err => {})
	}
}

// Fonction quand on obtient l'arrêt
async function whenStopObtained(interaction, stop, isComplete){
	// S'il n'y a pas d'arrêt, on arrête (ça rime wouhou)
	if(!stop) return

	// On défère l'interaction pour éviter les erreurs
	await interaction.deferUpdate().catch(err => { interaction.deferReply().catch(err => {}) })

	// On vérifie qu'on a tout les transports
	if(!transports) await getList(interaction)

	// On détermine des infos via l'id de l'interaction
	var line = interactionIds?.find(i => i.id == interaction.customId.split("-")[2])
	if(!line) return interaction.editReply({ embeds: [], components: [], content: "Commande expirée. Réessayez la commande." }).catch(err => {})
	var stops = line.stops
	line = line.line

	// Si c'est pas un arrêt complet, on essaye d'obtenir son identifiant
	if(!isComplete){
		// On essaye d'obtenir l'arrêt, limiter à 15 résultats
		var search = new Fuse(stops, { keys: ["name", "code", "city"], shouldSort: true, distance: 200, threshold: 0.4, ignoreLocation: true }).search(stop)
		if(!search?.[0]?.item?.id) return interaction.editReply({ embeds: [], content: "Je n'ai pas trouvé cet arrêt..." }).catch(err => {})
		search = search.slice(0, 15)

		// Si on a qu'un seul résultat, on l'utilise
		if(search.length == 1) stop = search[0].item.id

		// Sinon on demande à l'utilisateur de préciser
		else {
			const row = new ActionRowBuilder().addComponents( // eslint-disable-line
				new StringSelectMenuBuilder()
					.setCustomId(`diviaCmd-stop-${interaction.customId.split("-")[2]}`)
					.setPlaceholder("Choissisez un arrêt")
					.addOptions(search.map(s => {
						return new StringSelectMenuOptionBuilder().setLabel(`${s.item.name ? s.item.name : "Inconnu (???)"}`).setValue(s.item.id)
					})))
			await interaction.editReply({ embeds: [], components: [row] }).catch(err => {})
			return
		}
	}

	// On supprime l'interaction de la liste
	interactionIds = interactionIds.filter(i => i.id != interaction.customId.split("-")[2]) // On supprime l'interaction de la liste

	// Obtenir les horaires
	if(!jwtToken) jwtToken = await getJwtToken()
	var times = await fetch(`https://tim.divia.fr/api/get/totem?source_type=bo_divia_utilisateur&source_uuid=abc&ligne=${line?.id || line}&arret=${stop}&token=${jwtToken}`).then(r => r.json()).catch(err => { return { fetcherror: err } })
	if(times.fetcherror || times.message || times.code || !times?.result_infos?.totem){
		if(times.code == 401) jwtToken = await getJwtToken()
		return await bacheroFunctions.report.createAndReply("requête vers l'API de la Divia (n°3)", times.fetcherror || times.message || times, { jwtToken: jwtToken }, interaction)
	}
	else times = times.result_infos.totem

	// Rendre plus propre l'array des horaires
	times = times.map(t => { // On rend plus propre
		return {
			data_freshness: t.data_freshness,
			destination: t.destination,
			minutes: t?.minutes?.replace("<i>", "")?.replace("</i>", "")?.includes("\n") ? t?.minutes?.replace("<i>", "")?.replace("</i>", "") : null, // parfois c'est pas en minutes mais genre "3h15" | indique le temps restant avant le prochain passage
			duree: t.duree || t.duree2, // indique l'heure du départ
			status: t?.minutes == "tram" || t?.minutes == "bus" ? "**À l'approche**" : null
		}
	})
	times = times.filter(t => t.minutes || t.duree) // on enlève les horaires qui n'ont pas de minutes ou de duree

	// Créer l'embed
	var embed = new EmbedBuilder()
		.setTitle(`Horaires de passage à l'arrêt ${stops.find(s => s.id == stop).name}`)
		.setColor(bacheroFunctions.colors.primary)
		.setFooter({ text: "Données fournies par Divia" })
	if(times.length) embed.addFields(times.map(t => {
		return { name: t.destination, value: t.status ? t.status : t.minutes ? `Dans ${t.minutes.includes("h") ? t.minutes : `${t.minutes.replace("\n", " ").replace("min", `minute${parseInt(t.minutes) > 1 ? "s" : ""}`)}`}` : t.duree ? `À ${t.duree}` : `Oups... on dirait que j'ai un bug :/ (signale ça sur le github stp)${t.data_freshness == "base_schedule" ? " (horaires théoriques)" : t.data_freshness == "realtime" ? " (horaires en temps réel)" : ""}`, inline: true }
	}))
	if(!times.length) embed.setDescription("Aucun passages n'a pu être trouvé à cet arrêt. Tenter d'utiliser l'appli Divia pour plus de détails, ou réessayer plus tard.")

	// Répondre à l'interaction
	await interaction.editReply({ embeds: [embed], components: [], content: "" }).catch(err => {})
}

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("divia")
		.setDescription("Permet de récupérer les horaires sur le réseau de transport Divia"),

	// Récupérer le listener et savoir lorsque quelqu'un fait quelque chose
	async interactionListener(listener){
		// Pour les select menu
		listener.on("selectMenu", async (interaction) => {
			// Vérifier l'ids
			if(!interaction.customId.startsWith("diviaCmd-")) return
			// Vérifier l'auteur puis defer l'interaction
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})

			// Si on a sélectionné le service
			if(interaction.customId == "diviaCmd-service"){
				// Récupérer le service
				var type = interaction?.values?.[0]
				if(!type) return // en théorie on devrait jamais arriver ici, mais on sait jamais
				if(!transports) await getList(interaction)

				// Obtenir les lignes par rapport au service
				var lines = transports.filter(t => t.service.id == type)
				if(!lines.length) return interaction.reply({ content: "Je n'ai pas pu obtenir les informations sur les transports disponibles... Réessayer la commande.", ephemeral: true }).catch(err => {})
				lines = lines.sort((a, b) => a.commercialName.localeCompare(b.commercialName)) // trier les lignes par ordre alphabétique

				// Si on a plus de 25 lignes, on demande à l'utilisateur de préciser
				if(lines.length > 25){
					// Créer un embed
					var embed = new EmbedBuilder()
						.setTitle(`${lines.length} lignes trouvées`)
						.setDescription(lines.map(l => `- **${escape(l.commercialName || "Nom inconnu")}**${l.name ? l.name : ` > ${l.direction}` || "Direction inconnue"}`).join("\n"))
						.setColor(bacheroFunctions.colors.primary)

					// Créer le bouton pour choisir via un modal
					const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
						.setCustomId("diviaCmd-line")
						.setLabel("Choisir une ligne")
						.setStyle(ButtonStyle.Primary))
					await interaction.update({ embeds: [embed], components: [row] }).catch(err => {})
				}

				// Sinon on demande à l'utilisateur de choisir
				else {
					// Créer le select menu
					const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
						.setCustomId("diviaCmd-line")
						.setPlaceholder("Choissisez une ligne")
						.addOptions(lines.map(l => {
							return new StringSelectMenuOptionBuilder().setLabel(`${escape(l.commercialName || "Nom inconnu")}${l.name ? l.name : ` > ${l.direction}` || "Direction inconnue"}`).setValue(l.id)
						})))
					await interaction.update({ components: [row] }).catch(err => {})
				}
			}

			// Si on a sélectionné l'arrêt
			else if(interaction.customId.startsWith("diviaCmd-stop")) whenStopObtained(interaction, interaction?.values?.[0], true)

			// Si on a sélectionné la ligne
			else if(interaction.customId == "diviaCmd-line") whenLineObtained(interaction, interaction?.values?.[0], false)
		})

		// Pour les modals
		listener.on("modal", async (interaction) => {
			if(interaction.customId != "diviaCmd-modalLine" && !interaction.customId.startsWith("diviaCmd-modalStop-")) return
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})
			if(interaction.customId == "diviaCmd-modalLine") whenLineObtained(interaction, interaction?.fields?.getTextInputValue("diviaCmd-line"), true)
			else if(interaction.customId.startsWith("diviaCmd-modalStop-")) whenStopObtained(interaction, interaction?.fields?.getTextInputValue("diviaCmd-stop"), false)
		})

		// Pour les boutons
		listener.on("button", async (interaction) => {
			if(interaction.customId != "diviaCmd-line" && !interaction.customId.startsWith("diviaCmd-stop-")) return
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})

			if(interaction.customId == "diviaCmd-line"){ // choisir une ligne
				await interaction.showModal(new ModalBuilder()
					.setCustomId("diviaCmd-modalLine")
					.setTitle("Choissisez une ligne")
					.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
						.setCustomId("diviaCmd-line") // note: ne surtout pas mettre un identifiant ici
						.setLabel("Nom de la ligne")
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
						.setMinLength(1)
						.setMaxLength(70)))).catch(err => {})
				await interaction.deleteReply().catch(err => {})
			}

			else if(interaction.customId.startsWith("diviaCmd-stop-")){ // choisir un arrêt
				var id = interaction.customId.split("-")[2]
				await interaction.showModal(new ModalBuilder()
					.setCustomId(`diviaCmd-modalStop-${id}`)
					.setTitle("Choissisez un arrêt")
					.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
						.setCustomId("diviaCmd-stop") // note: ne surtout pas mettre un identifiant ici
						.setLabel("Nom de l'arrêt")
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
						.setMinLength(1)
						.setMaxLength(50)))).catch(err => {})
			}
		})
	},

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Vérifier et répondre si l'utilisateur est limité, sinon on le limite
		var checkAndReply = await bacheroFunctions.cooldown.checkAndReply(interaction, "transportModuleDiviaCmd")
		if(checkAndReply) return; else await bacheroFunctions.cooldown.set("transportModuleDiviaCmd", interaction.user.id, 5000)

		// On obtient la liste des transports et services s'il le faut
		if(!transports || !services) await getList(interaction)

		// Demander le service
		const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
			.setCustomId("diviaCmd-service")
			.setPlaceholder("Sélectionnez le service")
			.addOptions(services.map(s => {
				return new StringSelectMenuOptionBuilder().setLabel(s.name).setDescription(s.description.substring(0, 97).length != s.description.length ? `${s.description.substring(0, 97)}...` : s.description).setValue(s.id)
			})))
		interaction.reply({ components: [row] }).catch(err => {})
	}
}