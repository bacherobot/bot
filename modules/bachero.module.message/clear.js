const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js')
const bacheroFunctions = require('../../functions')
var botName = bacheroFunctions.config.getValue('bachero', 'botName')

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('clear')
		.setDescription('Supprime des messages dans ce salon')
		.addNumberOption(option => option.setName('count')
			.setDescription('Nombre de messages à supprimer')
			.setRequired(true)
			.setMinValue(1)
			.setMaxValue(100))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageMessages)
		.setDMPermission(false),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return 'stop' }) == 'stop') return

		// Obtenir le nombre de messages à supprimer
		var count = interaction.options.getNumber('count')

		// Créé un bouton pour confirmer qu'on sois sur de vouloir supprimer les messages
		var date = Date.now()
		const rowConfirm = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
			.setCustomId(`confirm-askClear-${date}`)
			.setLabel('Confirmer')
			.setStyle(ButtonStyle.Danger),
			new ButtonBuilder()
			.setCustomId(`cancel-askClear-${date}`)
			.setLabel('Finalement non')
			.setStyle(ButtonStyle.Success),
		)

		// Afficher l'embed de confirmation
		var embed = new EmbedBuilder()
		.setTitle("Suppression des messages")
		.setDescription(`T'es vraiment sûr de vouloir supprimer **${count == 1 ? "le dernier message" : "les " + count + " derniers messages"}** ?\n\nCette action est irréversible et ${count == 1 ? "le message ira" : "les messages iront"} dans les backrooms, force à ${count == 1 ? "lui" : "eux"}.`)
		.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
		interaction.editReply({ embeds: [embed], components: [rowConfirm] })

		// Quand quelqu'un clique sur le bouton
		const filter_confirm = i => i.customId == `confirm-askClear-${date}` || i.customId == `cancel-askClear-${date}`
		const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filter_confirm, time: 999999 })
		collector_confirm.on('collect', async i => {
			// Vérifier que la personne a les permissions de gérer les messages ou de gérer le salon
			if(!interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageChannels) && !interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageMessages)) return i.reply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission de gérer les messages ou de gérer ce salon.", ephemeral: true })

			// Si on annule
			if(i.customId == `cancel-askClear-${date}`){
				// Arrêter le collecteur et supprimer l'interaction
				collector_confirm.stop()
				return interaction.deleteReply().catch(err => {})
			}

			// Arrêter le collecteur et dire à la personne de supprimer
			collector_confirm.stop()
			if(await interaction.editReply({ embeds: [], components: [], content: "Veuillez patientez" }).catch(err => { return 'stop' }) == 'stop') return

			// Créé un bouton pour supprimer le message de succès
			date = Date.now()
			const rowDeleteMessageSuccess = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
				.setCustomId(`deleteMessageSuccessClear-${date}`)
				.setLabel('Masquer')
				.setStyle(ButtonStyle.Primary),
			)

			// Modifier le temps dans le salon
			var successMessage
			try {
				await interaction.channel.bulkDelete(count == 100 ? count : count + 1, true) // ajouter +1 (car on inclus l'interaction)
				successMessage = await interaction.channel.send({ content: `Tout est bon <@${interaction.user.id}>, ${count} message${count == 1 ? '' : 's'} devrait avoir été supprimé${count == 1 ? '' : 's'} !` })
				setTimeout(() => successMessage.edit({ components: [rowDeleteMessageSuccess] }).catch(err => {}), 4000)
			} catch(err) {
				// Si il y a eu une erreur
				var embed = new EmbedBuilder()
				.setTitle("Impossible de supprimer")
				.setDescription("Un problème est survenu lors de la suppression des messages :\n```\n" + (err?.toString()?.replace(/`/g, ' `').replace('Missing Permissions', "Je n'ai pas la permission de gérer ce salon.") || err) + "\n```")
				.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
				.setFooter({ text: `Si vous pensez que ce problème a quelque chose à voir avec ${botName}, n'hésitez pas à le signaler` })
				interaction.editReply({ embeds: [embed], components: [], content: null }).catch(err => {})
			}

			// Quand quelqu'un clique sur le bouton pour masquer le message de succès
			const filter_delete = i => i.customId == `deleteMessageSuccessClear-${date}`
			const collector_delete = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filter_delete, time: 999999 })
			collector_delete.on('collect', async i => {
				// Vérifier que la personne a les permissions de gérer les messages ou de gérer le salon
				if(!interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageChannels) && !interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageMessages)) return i.reply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission de gérer les messages ou de gérer ce salon.", ephemeral: true })

				// Si la personne a les bonnes permissions, arrêter le collecteur et supprimer le message
				collector_delete.stop()
				successMessage.delete().catch(err => {})
			})
		})
	}
}