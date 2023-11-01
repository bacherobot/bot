const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js")
const Fuse = require("fuse.js")
const fetch = require("node-fetch")
const bacheroFunctions = require("../../functions")

// Ids d'interactions
var interactionIds = []

// Cache
var cache_lines = {}
var cache_stops = {}

// Liste de tous les identifiants de transports
const transportIds = {
	tramway: [
		{ name: "Tramway 1", id: "LIG:IDFM:C01389" },
		{ name: "Tramway 2", id: "LIG:IDFM:C01390" },
		{ name: "Tramway 3a", id: "LIG:IDFM:C01391" },
		{ name: "Tramway 3b", id: "LIG:IDFM:C01679" },
		{ name: "Tramway 4", id: "LIG:IDFM:C01843" },
		{ name: "Tramway 5", id: "LIG:IDFM:C01684" },
		{ name: "Tramway 6", id: "LIG:IDFM:C01794" },
		{ name: "Tramway 7", id: "LIG:IDFM:C01774" },
		{ name: "Tramway 8", id: "LIG:IDFM:C01795" },
		{ name: "Tramway 9", id: "LIG:IDFM:C02317" },
		{ name: "Tramway 10", id: "LIG:IDFM:C02528" },
		{ name: "Tramway 11", id: "LIG:IDFM:C01999" },
		{ name: "Tramway 13", id: "LIG:IDFM:C02344" },
	],
	rer: [
		{ name: "RER A", id: "LIG:IDFM:C01742" },
		{ name: "RER B", id: "LIG:IDFM:C01743" },
		{ name: "RER C", id: "LIG:IDFM:C01727" },
		{ name: "RER D", id: "LIG:IDFM:C01728" },
		{ name: "RER E", id: "LIG:IDFM:C01729" },
	],
	metro: [
		{ name: "Métro 1", id: "LIG:IDFM:C01371" },
		{ name: "Métro 2", id: "LIG:IDFM:C01372" },
		{ name: "Métro 3", id: "LIG:IDFM:C01373" },
		{ name: "Métro 3 Bis", id: "LIG:IDFM:C01386" },
		{ name: "Métro 4", id: "LIG:IDFM:C01374" },
		{ name: "Métro 5", id: "LIG:IDFM:C01375" },
		{ name: "Métro 6", id: "LIG:IDFM:C01376" },
		{ name: "Métro 7", id: "LIG:IDFM:C01377" },
		{ name: "Métro 7 Bis", id: "LIG:IDFM:C01387" },
		{ name: "Métro 8", id: "LIG:IDFM:C01378" },
		{ name: "Métro 9", id: "LIG:IDFM:C01379" },
		{ name: "Métro 10", id: "LIG:IDFM:C01380" },
		{ name: "Métro 11", id: "LIG:IDFM:C01381" },
		{ name: "Métro 12", id: "LIG:IDFM:C01382" },
		{ name: "Métro 13", id: "LIG:IDFM:C01383" },
		{ name: "Métro 14", id: "LIG:IDFM:C01384" },
	],
	transilien: [
		{ name: "Transilien H", id: "LIG:IDFM:C01737" },
		{ name: "Transilien J", id: "LIG:IDFM:C01739" },
		{ name: "Transilien K", id: "LIG:IDFM:C01738" },
		{ name: "Transilien L", id: "LIG:IDFM:C01740" },
		{ name: "Transilien N", id: "LIG:IDFM:C01736" },
		{ name: "Transilien P", id: "LIG:IDFM:C01730" },
		{ name: "Transilien R", id: "LIG:IDFM:C01731" },
		{ name: "Transilien U", id: "LIG:IDFM:C01741" },
	]
}

// Fonction utilitaire pour obtenir un nom d'arrêt joli
function getStopName(name){
	// Modifications simples
	name = name.replaceAll(/(?<! )-(?! )/g, " ") // Remplacer les tirets par des espaces, s'ils ne sont pas entouré d'espace
	name = name.replace(/([A-Z])([A-Z]+)/g, (match, p1, p2) => { return p1 + p2.toLowerCase() }) // Remplacer les mots en majuscules par des minuscules sauf pour la première lettre

	// Certains mots on les remplace par d'autres
	name = name.replaceAll(" Rer", " RER")
	name = name.replaceAll(" Du ", " du ")
	name = name.replaceAll("St ", "Saint ")
	name = name.replaceAll("Gare De ", "Gare de ")
	name = name.replaceAll("La Defense", "La Défense")
	name = name.replaceAll("A.france", "Anatole France")
	name = name.replaceAll("Cite", "Cité")
	name = name.replaceAll("D'Italie", "d'Italie")
	name = name.replaceAll("Jonchere", "Jonchère")
	name = name.replaceAll("C.charlebourg", "Colombes Charlebourg")
	name = name.replaceAll("Asnieres", "Asnières")
	name = name.replaceAll("Porte d ", "Porte d'")
	name = name.replaceAll("Orleans", "Orléans")
	name = name.replaceAll("La Cavee", "La cavée")
	name = name.replaceAll("A l'arrêt", "À l'arrêt")
	name = name.replaceAll(" ....", "…")

	// Enlever si 2/3 espaces se suivent
	name = name.replaceAll("   ", " ")
	name = name.replaceAll("  ", " ")

	return name // Retourner le nom
}

// Fonction quand on obtient la ligne
async function whenLineObtained(interaction, line, isBus){
	// On défère l'interaction pour éviter les erreurs
	if(isBus) await interaction.deferReply().catch(err => {})
	else await interaction.deferUpdate().catch(err => {})

	// Si c'est un bus, on essaye d'obtenir son identifiant
	var _line = line
	if(cache_lines[line]) line = cache_lines[line] // si on l'a déjà en cache, on l'utilise
	else if(isBus){
		line = await fetch("https://www.bonjour-ratp.fr/api/bff/lines/search/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: line }) }).then(r => r.json()).catch(err => { return { fetcherror: err } })
		if(line.fetcherror) return await bacheroFunctions.report.createAndReply("requête vers l'API de la RATP (n°1)", line.fetcherror || line, {}, interaction)
		if(!line?.[0]?.id) return interaction.editReply({ content: "Je n'ai pas trouvé cette ligne de bus..." }).catch(err => {})
		line = { id: line?.[0]?.id, name: `BUS ${line?.[0]?.displayCode}` }
	} else line = transportIds[Object.keys(transportIds).find(t => transportIds[t].find(l => l.id == line))].find(l => l.id == line)

	// Obtenir les arrêts sur la ligne
	if(cache_stops[line.id]) var stops = cache_stops[line.id]
	else {
		var stops = await fetch(`https://www.bonjour-ratp.fr/api/lines/${line.id}/stop-places/`).then(r => r.json()).catch(err => { return { fetcherror: err } })
		if(stops.fetcherror) return await bacheroFunctions.report.createAndReply("requête vers l'API de la RATP (n°2)", stops.fetcherror || stops, {}, interaction)
		if(!stops?.length) return
		stops = stops.map(s => { return { id: s.id, name: s.displayName, code: s.postalCode, city: s.city } })
	}

	// Mettre en cache
	cache_lines[_line] = line
	cache_stops[line.id] = stops

	// Si on a plus de 25 arrêts, on demande à l'utilisateur de préciser
	if(stops.length > 25){
		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle(`${stops.length} arrêts trouvés sur ${line.name}`)
			.setDescription(stops.map(s => `- **${s.name ? s.name : "Inconnu (???)"}** ${s.code ? `${s.code} ` : ""}${s.city ? s.city : "Ville Inconnue"}`).join("\n"))
			.setColor(bacheroFunctions.colors.primary)

		// Créer le bouton pour choisir via un modal
		var id = Date.now()
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(`ratpCmd-stop-${id}`)
			.setLabel("Choisir un arrêt")
			.setStyle(ButtonStyle.Primary))
		interactionIds.push({ id: id, line: line, stops: stops })
		await interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})
	} else {
		// Répondre à l'interaction
		var id = Date.now()
		const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
			.setCustomId(`ratpCmd-stop-${id}`)
			.setPlaceholder("Choissisez un arrêt")
			.addOptions(stops.map(s => {
				return new StringSelectMenuOptionBuilder().setLabel(`${s.name ? s.name : "Inconnu (???)"}`).setDescription(`${s.code ? `${s.code} ` : ""}${s.city ? s.city : "Ville Inconnue"}`).setValue(s.id)
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

	// On détermine la ligne
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
			const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder() // On crée une action row
				.setCustomId(`ratpCmd-stop-${interaction.customId.split("-")[2]}`)
				.setPlaceholder("Choissisez un arrêt")
				.addOptions(search.map(s => {
					return new StringSelectMenuOptionBuilder().setLabel(`${s.item.name ? s.item.name : "Inconnu (???)"}`).setDescription(`${s.item.code ? `${s.item.code} ` : ""}${s.item.city ? s.item.city : "Ville Inconnue"}`).setValue(s.item.id)
				})))
			await interaction.editReply({ embeds: [], components: [row] }).catch(err => {})
			return
		}
	}
	interactionIds = interactionIds.filter(i => i.id != interaction.customId.split("-")[2]) // On supprime l'interaction de la liste

	// Obtenir les horaires
	var times = await fetch(`https://www.bonjour-ratp.fr/api/next-stops/${stop}/preview/`).then(r => r.json()).catch(err => { return { fetcherror: err } })
	if(times.fetcherror) return await bacheroFunctions.report.createAndReply("requête vers l'API de la RATP (n°2)", times.fetcherror || times, {}, interaction)
	if(!times?.length) return

	// Rendre plus propre l'array des horaires
	times = times.map(t => { // On rend plus propre
		return {
			lineName: t.lineName,
			situationCriticity: t.situationCriticity,
			nextStops: t.nextStops.map(s => {
				return { name: getStopName(s.destinationName), dateTime: s.dateTime, additionalWaitingTimeNote: s.additionalWaitingTimeNote, wait: s.waitingTimeInMinutes, status: !s.status || (s.status && s.rawFallback && (s.status == "UNKNOWN" || s.status == "DEGRADED")) ? getStopName(s.rawFallback.replace("Service Termine", "Service terminé").replace("Info Indispo ....", "Infos indisponibles").replace("Pas de Service", "Pas de service").replace("Service Non Commence", "Service non commencé").replace("Deviation Arret Non Desservi", "Arrêt non desservi, déviation").replace("Arret Non Desservi Travaux", "Arrêt non desservi, travaux")) : s.status.replace("UNAVAILABLE", null).replace("DEGRADED", null) }
			})
		}
	})
	times = times.map(t => { // On enlève les horaires inutiles
		return {
			lineName: t.lineName,
			situationCriticity: t.situationCriticity,
			nextStops: t.nextStops.filter(s => s.status != "null" && s.status != "Infos indisponibles" && s.status != "UNAVAILABLE")
		}
	})
	times = times.filter(t => t.nextStops.length > 0) // On enlève les lignes qui n'ont pas d'horaires

	// Créer l'embed
	var embed = new EmbedBuilder()
		.setTitle(`Horaires de passage à l'arrêt ${stops.find(s => s.id == stop).name}`)
		.setDescription(!times.length ? "Aucun passages n'a pu être trouvé à cet arrêt. Tenter d'utiliser l'appli RATP pour plus de détails, ou réessayer plus tard." : times.map(t => {
			return `### ${t.lineName} — ${t?.nextStops?.[0]?.name ? t?.nextStops?.[0]?.name?.substring(0, 106) : ""}${t?.situationCriticity ? " — Potentiels problèmes sur la ligne" : ""}\n${t.nextStops.map(s => {
				return `- ${s.status != "AVAILABLE_WAITING_TIME" && s.status ? s.status.replace("APPROACHING", "**À l'approche**").replace("ATDOCK", "**À quai**") : ""}${s.status != "AVAILABLE_WAITING_TIME" && s.status && typeof s.wait == "number" ? ` | ${s.wait} minute${s.wait > 1 ? "s" : ""}` : (typeof s.wait == "number" ? `${s.wait} minute${s.wait > 1 ? "s" : ""}` : (s.dateTime ? new Date(s.dateTime).toLocaleString() : ""))}${s.additionalWaitingTimeNote?.length ? ` | ${s.additionalWaitingTimeNote}` : ""}`
			}).join("\n")}`
		}).join("\n"))
		.setColor(bacheroFunctions.colors.primary)
		.setFooter({ text: "Données fournies par \"Bonjour RATP\"" })

	// Répondre à l'interaction
	await interaction.editReply({ embeds: [embed], components: [], content: "" }).catch(err => {})
}

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("ratp")
		.setDescription("Permet de récupérer les horaires sur le réseau de transport RATP"),

	// Récupérer le listener et savoir lorsque quelqu'un fait quelque chose
	async interactionListener(listener){
		// Pour les select menu
		listener.on("selectMenu", async (interaction) => {
			// Vérifier l'ids
			if(interaction.customId != "ratpCmd-type" && interaction.customId != "ratpCmd-line" && !interaction.customId.startsWith("ratpCmd-stop-")) return

			// Vérifier l'auteur puis defer l'interaction
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})

			// Si on a sélectionné le type de transport
			if(interaction.customId == "ratpCmd-type"){
				// Récupérer le type de transport
				var type = interaction?.values?.[0]
				if(!type) return // en théorie on devrait jamais arriver ici, mais on sait jamais

				// Si c'est le bus, demander le numéro de la ligne via un modal
				if(type == "bus"){
					interaction.showModal(new ModalBuilder()
						.setCustomId("ratpCmd-modalLine")
						.setTitle("Choissisez une ligne")
						.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
							.setCustomId("ratpCmd-line")
							.setLabel("Ligne de bus")
							.setStyle(TextInputStyle.Short)
							.setRequired(true)
							.setMinLength(1)
							.setMaxLength(4)))).catch(err => {})
					await interaction.deleteReply().catch(err => {})
				}

				// Sinon
				else {
					if(!transportIds[type]) return // en théorie on devrait jamais arriver ici, mais on sait jamais
					const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
						.setCustomId("ratpCmd-line")
						.setPlaceholder("Choissisez une ligne")
						.addOptions(transportIds[type].map(t => new StringSelectMenuOptionBuilder().setLabel(t.name).setValue(t.id))))

					await interaction.update({ components: [row] }).catch(err => {})
				}
			}

			// Si on a choisit une ligne
			else if(interaction.customId == "ratpCmd-line") whenLineObtained(interaction, interaction?.values?.[0], false)

			// Si on a choisit un arrêt
			else if(interaction.customId.startsWith("ratpCmd-stop-")) whenStopObtained(interaction, interaction?.values?.[0], true)
		})

		// Pour les modals
		listener.on("modal", async (interaction) => {
			if(interaction.customId != "ratpCmd-modalLine" && !interaction.customId.startsWith("ratpCmd-modalStop")) return
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})
			if(interaction.customId == "ratpCmd-modalLine") whenLineObtained(interaction, interaction?.fields?.getTextInputValue("ratpCmd-line"), true)
			if(interaction.customId.startsWith("ratpCmd-modalStop")) whenStopObtained(interaction, interaction?.fields?.getTextInputValue("ratpCmd-stop"), false)
		})

		// Pour les boutons
		listener.on("button", async (interaction) => {
			if(!interaction.customId.startsWith("ratpCmd-stop-")) return
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})

			if(interaction.customId.startsWith("ratpCmd-stop-")){
				var id = interaction.customId.split("-")[2]
				await interaction.showModal(new ModalBuilder() // Créer un modal pour demander le nom de l'arrêt
					.setCustomId(`ratpCmd-modalStop-${id}`)
					.setTitle("Choissisez un arrêt")
					.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
						.setCustomId("ratpCmd-stop") // note: ne surtout pas mettre un identifiant ici
						.setLabel("Nom de l'arrêt")
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
						.setMinLength(1)
						.setMaxLength(50)))).catch(err => {})
			}
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Vérifier et répondre si l'utilisateur est limité, sinon on le limite
		var checkAndReply = await bacheroFunctions.cooldown.checkAndReply(interaction, "transportModuleRatpCmd")
		if(checkAndReply) return; else await bacheroFunctions.cooldown.set("transportModuleRatpCmd", interaction.user.id, 7000)

		// Demander le type de transport
		const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
			.setCustomId("ratpCmd-type")
			.setPlaceholder("Sélectionnez le type de transport")
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel("BUS")
					.setValue("bus"),
				new StringSelectMenuOptionBuilder()
					.setLabel("RER")
					.setValue("rer"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Métro")
					.setValue("metro"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Tramway")
					.setValue("tramway"),
				new StringSelectMenuOptionBuilder()
					.setLabel("Transilien")
					.setValue("transilien"),
			))
		interaction.reply({ components: [row] }).catch(err => {})
	}
}