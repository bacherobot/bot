const Discord = require("discord.js")
const bacheroFunctions = require("../../functions")
const htmlParser = require("node-html-parser")
const fetch = require("node-fetch")

// Vérifier qu'un array commence par un texte
function startsWith(text, array) {
	for (let i = 0; i < array.length; i++) {
		if (text.startsWith(array[i])) return true
	}
	return false
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new Discord.SlashCommandBuilder()
		.setName("fluo")
		.setDescription("Rechercher un arrêt dans la région Grand-Est")
		.addStringOption(option => option.setName("query")
			.setDescription("Arrêt à rechercher")
			.setRequired(true)),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply({ ephemeral: false }).catch(err => { return "stop" }) == "stop") return

		// Récupérer le terme de recherche
		let query = interaction.options.getString("query")

		// Rechercher les arrêts
		var stops = await fetch(`https://api.grandest2.cityway.fr/search/address?keywords=${query}&maxitems=10&pointtypes=4`).then(res => res.json()).catch(err => { return { fetcherror: err } })
		if(stops.fetcherror || !stops?.StatusCode) return await bacheroFunctions.report.createAndReply("requête vers l'API de Fluo (n°1)", stops.fetcherror || stops, {}, interaction)

		// Faire un select menu
		let selectMenu = new Discord.StringSelectMenuBuilder()
			.setCustomId("select-fluo")
			.setPlaceholder("Choisissez un arrêt")
			.setMinValues(1)
			.setMaxValues(1)

		// Filtrer les arrêts
		let regex = new RegExp("^(0[1-9]|[1-8][0-9]|9[0-8])[0-9]{3}$")
		let data = stops.Data.filter(stop => regex.test(stop.Locality.Code))
		let postalCodes = ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"]
		data = data.filter(stop => startsWith(stop.Locality.Code, postalCodes))

		// Si on a pas de résultats
		if(!data?.length) return await interaction.editReply({ content: "Aucun arrêt trouvé", components: [] }).catch(err => {})

		// Ajouter les options
		data.forEach(stop => {
			selectMenu.addOptions(new Discord.StringSelectMenuOptionBuilder().setLabel(`${stop.Name}`).setDescription(`${stop.Locality.Name} - ${stop.Locality.Code}`).setValue(stop.Id.toString()))
		})

		// Répondre avec le select menu
		await interaction.editReply({ components: [new Discord.ActionRowBuilder().addComponents(selectMenu)] }).catch(err => {})
	},

	// Détecter quand un utilisateur interagit avec le select menu
	interactionListener(listener) {
		listener.on("selectMenu", async interaction => {
			if (interaction.customId === "select-fluo") {
				// Si on a pas la valeur (???)
				if(!interaction.values[0]) return // c'est pas normal, mais on sait jamais

				// Mettre la réponse en defer
				if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

				// On obtient les données de l'arrêt
				var stops = await fetch(`https://www.fluo.eu/api/PhysicalStop/GetStops?logicalId=${interaction.values[0]}`, { method: "GET", headers: { "Content-Type": "application/json" } }).then(res => res.json()).catch(err => { return { fetcherror: err } })
				if(stops.fetcherror) return await bacheroFunctions.report.createAndReply("requête vers l'API de Fluo (n°2)", stops.fetcherror || stops, {}, interaction)
				else stops = stops.Data

				// On crée un embed
				let embed = new Discord.EmbedBuilder()
					.setTitle(`${stops?.[0]?.Name} - Prochains départs`)
					.setColor(bacheroFunctions.colors.primary)
					.setFooter({ text: "Données fournies par Fluo Grand Est" })

				// Récupérer les prochains départs
				var nextsStops = await fetch(`https://www.fluo.eu/fr/NextDeparture/logicalstop?logicalId=${interaction.values[0]}&group=&_=${Date.now()}`).then(res => res.text()).catch(err => { return { fetcherror: err } })
				if(nextsStops.fetcherror) return await bacheroFunctions.report.createAndReply("requête vers l'API de Fluo (n°3)", nextsStops.fetcherror || nextsStops, {}, interaction)

				// On parse le HTML (l'API ne retourne pas de JSON)
				let dom = htmlParser.parse(nextsStops)

				// Si on a un avertissement
				if(dom.querySelector("p.alert.alert-warning")?.innerText?.length) embed.setDescription(`⚠️ ${dom.querySelector("p.alert.alert-warning")?.innerText?.replace(/&#233;/g, "é").trim()}`)

				// Pour chaque élément de la liste
				dom.querySelectorAll("li").forEach(li => {
					// Obtenir les spans
					let spans = [...li.querySelectorAll("span.item-text")]

					// Déterminer la destination
					let dest = spans.filter(span => span.classList.length === 1)[0].innerText

					// On détermine l'heure, et on la rend plus propre
					let hour = li.querySelector("span.item-text.bold.next-departure-duration.no-margin-right").innerText
					if(hour) hour = hour.split("").filter(char => char !== " ").filter(char => char !== "\n").filter(char => char !== "\r").join("")
					if(hour) hour = hour.replace("<", "< ").replace("min", " min")

					// De même pour le type de transport
					let type = li.querySelector(".item-img.cw-transinfo.cw-transinfo.mode-transport").getAttribute("title")
					if(type) type = type.replace("T.G.V.", "TGV").replace("Train T.E.R.", "TER")

					// On ajoute le field
					embed.addFields({ name: `[${type || "Type inconnu"}] ${dest || "Destination inconnue"}`, value: hour, inline: true })
				})

				// Répondre avec l'embed
				await interaction.message.edit({ embeds: [embed], components: [] }).catch(err => {})
				await interaction.deleteReply().catch(err => {})
			}
		})
	}
}