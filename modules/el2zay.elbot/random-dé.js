const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")

module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("random-dé")
		.setDescription("Lance un dé")
		.addIntegerOption(option => option
			.setName("type")
			.setDescription("Type de dé à lancer")
			.setChoices(
				{ name: "dé de 4", value: 4 },
				{ name: "dé de 6", value: 6 },
				{ name: "dé de 8", value: 8 },
				{ name: "dé de 10", value: 10 },
				{ name: "dé de 12", value: 12 },
				{ name: "dé de 20", value: 20 },
			)
			.setRequired(true))
		.addIntegerOption(option => option
			.setName("nombre")
			.setDescription("Nombre de dés à lancer")
			.setRequired(false)
			.setMinValue(1)
			.setMaxValue(25))
		.addIntegerOption(option => option
			.setName("modificateur")
			.setDescription("Additionne le nombre que vous voulez au total de vos lancers")
			.setRequired(false)),

	async execute(interaction){
		// Defer l'interaction
		let msg = await interaction.deferReply().catch(err => {})

		// Arguments
		var type = interaction.options.getInteger("type") || 6
		var nombre = interaction.options.getInteger("nombre") || 1
		var modificateur = interaction.options.getInteger("modificateur") || 0

		// Créé la ligne de boutons
		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`elbotde-relancer-${msg.id}`)
				.setLabel("Relancer")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`elbotde-add-${msg.id}`)
				.setLabel("Ajouter un dé")
				.setStyle(ButtonStyle.Secondary)
		)

		// Faire un random selon le type de dé
		var randoms = []
		if(modificateur) randoms.push(modificateur)
		for (let index = 0; index < nombre; index++) {
			randoms.push(Math.floor(Math.random() * type) + 1)
		}

		// Faire l'embed
		const embed = new EmbedBuilder()
			.setTitle("Lancer de dés")
			.addFields(
				{ name: "Dés lancées", value: randoms.length.toString(), inline: true },
				{ name: "Total", value: randoms.reduce((acc, valeur) => acc + valeur, 0).toString(), inline: true },
				{ name: "Lancées", value: randoms.join(", ") }
			)
			.setColor(bacheroFunctions.colors.primary)
		await interaction.editReply({ embeds: [embed], components: [row] }).catch(err => {})

		// Quand quelqu'un clique sur le bouton
		const filter_confirm = i => i.customId == `elbotde-relancer-${msg.id}` || i.customId == `elbotde-add-${msg.id}`
		const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filter_confirm })
		collector_confirm.on("collect", async i => {
			// Si l'utilisateur veut relancer
			if (i.customId == `elbotde-relancer-${msg.id}`) {
				// Faire un random selon le type de dé
				randoms = []
				if(modificateur) randoms.push(modificateur)
				for (let index = 0; index < nombre; index++) {
					randoms.push(Math.floor(Math.random() * type) + 1)
				}

				// Modifier l'embed
				embed.setFields(
					{ name: "Dés lancées", value: randoms.length.toString(), inline: true },
					{ name: "Total", value: randoms.reduce((acc, valeur) => acc + valeur, 0).toString(), inline: true },
					{ name: "Lancées", value: randoms.join(", ") }
				)

				// Modifier le message
				await i.update({ embeds: [embed], components: [row] }).catch(err => {})
			}

			// Si l'utilisateur veut ajouter un dé
			if (i.customId == `elbotde-add-${msg.id}`) {
				// Ajouter un dé
				randoms.push(Math.floor(Math.random() * type) + 1)
				nombre += 1

				// Si on a plus de 25 dés
				if (randoms.length > 25) return i.reply({ content: "Vous ne pouvez pas avoir plus de 25 dés", ephemeral: true }).catch(err => {})

				// Modifier l'embed
				embed.setFields(
					{ name: "Dés lancées", value: randoms.length.toString(), inline: true },
					{ name: "Total", value: randoms.reduce((acc, valeur) => acc + valeur, 0).toString(), inline: true },
					{ name: "Lancées", value: randoms.join(", ") }
				)

				// Modifier le message
				await i.update({ embeds: [embed], components: [row] }).catch(err => {})
			}
		})
	}
}
