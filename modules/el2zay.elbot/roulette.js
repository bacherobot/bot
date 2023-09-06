const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder, time } = require("discord.js")
const bacheroFunctions = require("../../functions")
const escape = require("markdown-escape")
const { rando } = require("@nastyox/rando.js")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("roulette")
		.setDescription("Lancer un tirage au sort dans ce salon")
		.setDMPermission(false)
		.addStringOption(option => option
			.setName("cadeau")
			.setDescription("Le cadeau à gagner")
			.setRequired(true))
		.addIntegerOption(option => option
			.setName("secondes")
			.setDescription("La durée en secondes avant la fin de la roulette")
			.setMinValue(2)
			.setMaxValue(3600)
			.setRequired(true))
		.addAttachmentOption(option => option
			.setName("image")
			.setDescription("Image du cadeau à gagner")
			.setRequired(false))
		.addIntegerOption(option => option
			.setName("min_participants")
			.setDescription("Le nombre minimum de participants")
			.setMinValue(2))
		.addIntegerOption(option => option
			.setName("max_participants")
			.setDescription("Le nombre maximum de participants")
			.setMinValue(2)
			.setMaxValue(999)),

	async execute(interaction){
		// Si le cadeau c'est "rien"
		if(interaction.options.getString("cadeau").toLowerCase() == "rien") return interaction.reply({ content: "T'es radin toi, comment ça rien", ephemeral: true }).catch(err => {})

		// Defer l'interaction
		let msg = await interaction.deferReply().catch(err => {})

		// On récupère l'attachement, s'il y en a un, et le cadeau
		const attachment = await interaction.options.getAttachment("image")
		const cadeau = interaction.options.getString("cadeau")

		// Liste des participants
		var participation = []
		const min_participants = interaction.options.getInteger("min_participants") || 2
		const max_participants = interaction.options.getInteger("max_participants") || 999

		// Date de fin de la roulette
		const date = new Date()
		date.setSeconds(date.getSeconds() + (interaction.options.getInteger("secondes") || 20))
		const relative = time(date, "R")

		// Timeout qu'on utilisera pour arrêter la roulette à la fin
		var timeout

		// Création des boutons
		const rowConfirm = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`roulette-ok-${msg.id}`)
				.setEmoji("✅")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(`roulette-no-${msg.id}`)
				.setEmoji("❌")
				.setStyle(ButtonStyle.Secondary),
		)

		// On détecte quand quelqu'un clique sur un bouton
		const filter_confirm = i => i.customId == `roulette-ok-${msg.id}` || i.customId == `roulette-no-${msg.id}`
		const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filter_confirm })
		collector_confirm.on("collect", async i => {
			// Pouvoir faire participer quelqu'un
			if (i.customId == `roulette-ok-${msg.id}`) {
				// Si la personne a déjà participé
				if (participation.includes(i.user.id)) return i.reply({ content: "🚫 Vous participez déjà à la roulette !", ephemeral: true }).catch(err => {})

				// Sinon on l'a fait participer
				participation.push(i.user.id)
				await i.reply({ content: "Vous participez à la roulette !", ephemeral: true }).catch(err => {})
			}

			// Pouvoir retirer quelqu'un
			if (i.customId == `roulette-no-${msg.id}`) {
				// Si la personne ne participe pas encore
				if (!participation.includes(i.user.id)) return i.reply({ content: "🚫 Vous ne participez pas à la roulette !", ephemeral: true }).catch(err => {})

				// Retirer la personne du tableau
				participation.splice(participation.indexOf(i.user.id), 1)
				await i.reply({ content: "Vous ne participez plus à la roulette !", ephemeral: true }).catch(err => {})
			}

			// Modifier l'embed
			embed.setFields(
				{ name: "Temps restant", value: relative, inline: true },
				{ name: "Cadeau à gagner", value: `||${escape(cadeau)}||`, inline: true },
				{ name: "Participants", value: participation ? participation.length.toString() : "0", inline: true }
			)
			if (max_participants != 999) embed.addFields({ name: "Nombre restant de participations", value: `${max_participants - participation.length}`, inline: true })
			if (min_participants) embed.addFields({ name: "Nombre minimum de participants", value: `${min_participants}`, inline: true })
			await interaction.editReply({ embeds: [embed], components: [rowConfirm] }).catch(err => {})

			// Si le nombre de participants max est atteint, arrêter le timout
			if(max_participants == participation.length) return endRoulette()
		})

		// On fait un embed avec les infos de la roulette
		var embed = new EmbedBuilder()
			.setTitle("Roulette")
			.setDescription(`<@${interaction.user.id}> a lancé la roulette !\nCliquez sur le bouton pour participer.`)
			.setColor(bacheroFunctions.colors.primary)
			.addFields(
				{ name: "Temps restant", value: relative, inline: true },
				{ name: "Cadeau à gagner", value: `||${escape(cadeau)}||`, inline: true },
				{ name: "Participants", value: participation ? participation.length.toString() : "0", inline: true }
			)
		if (max_participants != 999) embed.addFields({ name: "Nombre restant de participations", value: `${max_participants}`, inline: true })
		if (min_participants) embed.addFields({ name: "Nombre minimum de participants", value: `${min_participants}`, inline: true })
		if (attachment) embed.setImage(attachment.url)

		// On envoie l'embed
		await interaction.editReply({ embeds: [embed], components: [rowConfirm] }).catch(err => {})

		// On arrête la roulette automatiquement au bout d'une durée
		timeout = setTimeout(() => {
			endRoulette()
		}, date.getTime() - Date.now())

		// Fonction pour arrêter la roulette
		async function endRoulette() {
			// Si on a le timeout, on l'arrête
			if (timeout) clearTimeout(timeout)

			// On arrête le collector
			collector_confirm.stop()

			// On détermine le vainqueur
			var winner = rando(participation)
			winner = winner ? winner.value : null

			// Si on a aucun participant
			if (!winner || participation.length < min_participants) {
				embed = new EmbedBuilder()
					.setTitle("Roulette")
					.setDescription("Il y a eu trop peu de participants pour cette roulette...\nDonc aucun gagnant.")
					.setColor(bacheroFunctions.colors.primary)
					.setFooter({ text: "Ah c'est dommage !" })
				await interaction.editReply({ embeds: [embed], components: [] }).catch(err => {})
			} else {
				embed = new EmbedBuilder()
					.setTitle("Roulette")
					.setDescription(`Le grand gagnant (ou perdant) de cette roulette est ||<@${winner}>|| qui a gagné "${escape(cadeau)}" !`)
					.setColor(bacheroFunctions.colors.primary)
					.setFooter({ text: "J'espère ton cadeau est bien" })
				await interaction.editReply({ embeds: [embed], components: [] }).catch(err => {})
			}

			// On fait un follow up pour dire que la roulette est finie
			try {
				await interaction.followUp({ content: "La roulette est finie !" }).catch(err => {})
			} catch (err) {}
		}
	}
}