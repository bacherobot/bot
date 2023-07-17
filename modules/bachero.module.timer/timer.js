const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('bachero.module.timer')
const { customAlphabet } = require('nanoid'), nanoid = customAlphabet('abcdefghiklnoqrstuvyz123456789', 14)
var botName = bacheroFunctions.config.getValue('bachero', 'botName')

// Préparer des variables qui seront utilisées plus tard
var buttonsIds = [];
var forcedDeletedTimers = [];

// Fonction pour obtenir les timers en cours
async function runningTimers(){
	var timers = Object.values(await bacheroFunctions.database.getAll(database))
	forcedDeletedTimers.some(forcedDeletedTimerId => {
		if(timers.find(a => a.timerId == forcedDeletedTimerId)) timers = timers.filter(a => a.timerId != forcedDeletedTimerId)
	})
	return timers || []
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('timer')
		.setDescription('Gérer un minuteur')
		.addSubcommand((subcommand) => subcommand
			.setName('create')
			.setDescription('Permet de créer un minuteur')
			.addNumberOption(option => option.setName('duration')
				.setDescription("Durée avant que le minuteur n'expire")
				.setRequired(true)
			)
			.addStringOption(option => option.setName('type')
				.setDescription("Type de minuteur")
				.setChoices(
					{ name: 'Milliseconde', value: 'ms' },
					{ name: 'Seconde', value: 'sec' },
					{ name: 'Minute', value: 'min' },
					{ name: 'Heure', value: 'hour' },
					{ name: 'Jour', value: 'day' }
				)
				.setRequired(false)
			)
			.addStringOption(option => option.setName('reason')
				.setDescription('Raison du minuteur')
				.setMaxLength(512)
				.setRequired(false)
			),
		)
		.addSubcommand((subcommand) => subcommand
			.setName('list')
			.setDescription('Affiche la liste des minuteurs en cours')
		)
		.addSubcommand((subcommand) => subcommand
			.setName('details')
			.setDescription('Affiche les détails sur un minuteur')
			.addStringOption(option => option.setName('id')
				.setDescription('Identifiant du minuteur')
				.setMaxLength(320)
				.setRequired(true)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName('delete')
			.setDescription('Supprime un minuteur en cours')
			.addStringOption(option => option.setName('id')
				.setDescription('Identifiant du minuteur')
				.setMaxLength(320)
				.setRequired(true)
			)
		),

	// Obtenir le client
	async getClient(client){
		// Vérifier toute les secondes qu'un minuteur ne soit pas terminé
		setInterval(async () => {
			(await runningTimers()).forEach(async timer => {
				// Vérifier que le minuteur soit écoulé
				if(new Date(timer?.endDate).getTime() < Date.now()){
					// On supprime le minuteur
					forcedDeletedTimers.push(timer.timerId)
					await bacheroFunctions.database.delete(database, timer.timerId)

					// On déduit que le minuteur est terminé, et on envoie un message au créateur du minuteur
					try {
						client.users.fetch(timer.authorId).then(async user => {
							// Créer un embed
							var listFields = [
								timer.userDuration ? { name: 'Durée', value: timer.userDuration, inline: true } : null,
								timer.startDate ? { name: 'Début', value: `<t:${Math.round(timer?.startDate / 1000)}:R>`, inline: true } : null,
								timer.reason ? { name: 'Raison', value: timer.reason, inline: true } : null,
								timer.timerId ? { name: 'Identifiant', value: `\`${timer.timerId}\``, inline: true } : null,
							]
							var timerEndMs = new Date(timer.endDate).getTime()
							const embed = new EmbedBuilder()
							.setTitle('Minuteur terminé')
							.setDescription(`C'est l'heure ! Votre minuteur est terminé.${timerEndMs + 5000 < Date.now() ? `\n*En raison d'un problème avec l'hébergement de ${botName}, du retard a pu être causé (${Math.round((Date.now() - timerEndMs) / 1000)} secondes)*` : ''}`)
							.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
							.addFields(listFields.filter(field => field != null))

							// Ajouter un bouton qui permet de recréer le minuteur
							var date = Date.now()
							const row = new ActionRowBuilder().addComponents(
								new ButtonBuilder()
								.setCustomId(`confirm-createTimer-${date}`)
								.setLabel('Recréer le même minuteur')
								.setStyle(ButtonStyle.Primary)
							)

							// Ajouter le bouton du minuteur dans la liste des boutons existants et envoyer le message
							buttonsIds.push({ customId: `confirm-createTimer-${date}`, userDuration: timer.userDuration, duration: timer.duration, startDate: Date.now(), reason: timer.reason, authorId: user.id, timerId: nanoid() })
							user.send({ embeds: [embed], components: [row] }).catch(err => {})
						})
					} catch(err){}
				}
			})
		}, 1000)
	},

	// Récupérer le listener bouton (quand quelqu'un clique sur un bouton)
	async interactionListener(listener){
		listener.on('button', async (interaction) => {
			// Si le bouton SEMBLE valide, mais ne l'est pas
			if((interaction.customId.startsWith('confirm-createTimer-') || interaction.customId.startsWith('cancel-createTimer-') || interaction.customId.startsWith('confirm-deleteTimer-') || interaction.customId.startsWith('cancel-deleteTimer-')) && !buttonsIds.map(a => a.customId).includes(interaction.customId)){
				return interaction.reply({ content: "Impossible de récupérer le contenu de ce bouton, tenter de refaire la commande.", ephemeral: true }).catch(err => {})
			}

			// Si le bouton ne semble pas valide, et qu'il ne l'est pas, on arrête
			if(!buttonsIds.map(a => a.customId).includes(interaction.customId)) return;

			// Récupérer les infos du bouton
			var button = buttonsIds.find(a => a.customId == interaction.customId)

			// Si on est pas la personne qui a voulu créer le minuteur
			if(interaction.user.id != button.authorId) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})

			// Supprimer le bouton de la liste
			buttonsIds.splice(buttonsIds.indexOf(button), 1)

			// Si l'action du bouton consiste à annuler la création du minuteur
			if(interaction.customId.startsWith('cancel-createTimer-') || interaction.customId.startsWith('cancel-deleteTimer-')){
				return button.interaction.deleteReply().catch(err => {})
			}

			// Si on veut créer un minuteur
			if(interaction.customId.startsWith('confirm-createTimer-')){
				// Et sinon lets go ajouter les infos du minuteur dans une variable
				var timerInfo = {
					duration: button?.duration,
					startDate: button?.startDate,
					endDate: button?.endDate,
					reason: button?.reason,
					authorId: button?.authorId,
					timerId: button?.timerId,
					userDuration: button?.userDuration
				}

				// Si on a pas la date de fin, la déterminer
				if(!timerInfo?.endDate){
					timerInfo.endDate = new Date()
					timerInfo.endDate.setMilliseconds(timerInfo.endDate.getMilliseconds() + timerInfo.duration)
				}

				// Si le temps de faire tout ça, le minuteur s'est déjà terminé
				if(timerInfo.endDate < Date.now() && button.interaction) return button.interaction.editReply({ content: `On n'a même pas eu le temps de finir la création du minuteur que.. c'est fini !`, embeds: [], components: [] }).catch(err => {})
				else if(timerInfo.endDate < Date.now()) return interaction.reply({ content: `On n'a même pas eu le temps de finir la création du minuteur que.. c'est fini !`, embeds: [], components: [], ephemeral: true }).catch(err => {})

				// On ajoute à la liste des minuteurs
				bacheroFunctions.database.set(database, timerInfo?.timerId, timerInfo)

				// On finit par modifier l'interaction de base pour dire que le minuteur a commencé
				if(button.interaction) button.interaction.editReply({ content: `C'est parti ! Vous serez rappeler <t:${Math.round(timerInfo?.endDate / 1000)}:R>.\nIdentifiant du minuteur : \`${timerInfo?.timerId}\``, embeds: [], components: [] }).catch(err => {})
				else interaction.reply({ content: `C'est parti ! Vous serez rappeler <t:${Math.round(timerInfo?.endDate / 1000)}:R>.\nIdentifiant du minuteur : \`${timerInfo?.timerId}\``, embeds: [], components: [] }).catch(err => {})
			}

			// Si on veut supprimer un minuteur
			if(interaction.customId.startsWith('confirm-deleteTimer-')){
				// On supprimer le minuteur
				await bacheroFunctions.database.delete(database, button?.timer?.timerId)

				// On finit par modifier l'interaction de base
				button.interaction.editReply({ content: `Le minuteur a été supprimé avec succès !`, embeds: [], components: [] }).catch(err => {})
			}
		})
	},

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Si on veut créer un minuteur
		if(interaction.options.getSubcommand() == 'create'){
			// Obtenir les options
			var duration = interaction.options.getNumber('duration')
			var type = interaction.options.getString('type') || 'sec'
			var reason = interaction.options.getString('reason')

			// Convertir la durée en millisecondes
			userDuration = `${duration} ${type.replace('sec', 'secondes').replace('ms', 'millisecondes').replace('min', 'minutes').replace('hour', 'heures').replace('day', 'jours')}`
			if(type == 'sec') duration = duration * 1000
			if(type == 'min') duration = duration * 1000 * 60
			if(type == 'hour') duration = duration * 1000 * 60 * 60
			if(type == 'day') duration = duration * 1000 * 60 * 60 * 24

			// Vérifier que la durée soit valide
			if(duration < 1) return interaction.reply({ content: 'La durée doit être supérieure à 0', ephemeral: true }).catch(err => {})
			if(duration > 14 * 86400000) return interaction.reply({ content: 'La durée doit être inférieure à 14 jours', ephemeral: true }).catch(err => {})

			// Déterminer la date de fin du minuteur
			var endDate = new Date()
			endDate.setMilliseconds(endDate.getMilliseconds() + duration)

			// Créer un embed
			var embed = new EmbedBuilder()
			.setTitle("Création d'un minuteur")
			.setDescription(`${type == 'ms' ? '⚠️ Les minuteurs sont précis à la seconde, une durée en millisecondes ne sera pas exacte et aura une seconde de retard maximum\n\n' : ''}Vous vous apprêtez à créer un minuteur qui s'arrêtera <t:${Math.round(endDate / 1000)}:R>${reason?.length ? ` avec la raison "${reason?.replace(/`/g, '')?.replace(/"/g, '')}"` : ''}.`)
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))

			// Créé deux boutons pour confirmer qu'on sois sur
			var date = Date.now()
			const rowConfirm = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
				.setCustomId(`confirm-createTimer-${date}`)
				.setLabel('Confirmer')
				.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
				.setCustomId(`cancel-createTimer-${date}`)
				.setLabel('Finalement non')
				.setStyle(ButtonStyle.Danger),
			)
			buttonsIds.push({ customId: `confirm-createTimer-${date}`, interaction: interaction, userDuration: userDuration, duration: duration, startDate: Date.now(), endDate: endDate, reason: reason, authorId: interaction.user.id, timerId: nanoid() }, { customId: `cancel-createTimer-${date}`, interaction: interaction, userDuration: userDuration, duration: duration, endDate: endDate, reason: reason, authorId: interaction.user.id, timerId: nanoid() })

			// Répondre avec l'embed et les boutons
			interaction.reply({ embeds: [embed], components: [rowConfirm] }).catch(err => {})
		}

		// Si on veut lister les minuteurs
		if(interaction.options.getSubcommand() == 'list'){
			// Obtenir la liste des minuteurs
			var timers = (await runningTimers()).filter(timer => timer?.authorId == interaction.user.id)
			timers = timers.sort((a, b) => new Date(a?.endDate).getTime() - new Date(b?.endDate).getTime()) // trier pour afficher en premier ceux qui se finissent en premier

			// Créer un embed
			var embed = new EmbedBuilder()
			.setTitle("Vos minuteurs")
			.setDescription(!timers?.length ? "Vous n'avez aucun minuteur en cours.\n*Note : pour une meilleure gestion interne, certains minuteurs durant moins de 2 minutes ne sont affichés dans cette liste*" : `Vous avez actuellement ${timers?.length} minuteur${timers?.length > 1 ? 's' : ''} en cours :\n${timers?.length > 1 ? '\n' : ''}ㅤ  • ${timers?.map(tim => `<t:${Math.round(new Date(tim?.endDate).getTime() / 1000)}:R> (ID : \`${tim?.timerId}\`)${tim?.reason?.length ? `\nㅤ  ㅤ  « ${tim?.reason.replace(/«/g, '"').replace(/»/g, '"').replace(/`/g, '')} »` : ''}`)?.join('\nㅤ  • ')}`.substring(0, 4000))
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))

			// L'envoyer
			interaction.reply({ embeds: [embed], ephemeral: true }).catch(err => {})
		}

		// Si on veut afficher les détails d'un minuteur
		if(interaction.options.getSubcommand() == 'details'){
			// Obtenir l'identifiant du minuteur
			var timerId = interaction.options.getString('id')

			// Obtenir le minuteur associé à cet identifiant
			var timer = (await runningTimers()).find(timer => timer?.timerId == timerId)
			if(!timer) var timer = (await runningTimers()).find(timer => timer?.timerId?.toLowerCase()?.replace(/_/g,'') == timerId?.toLowerCase()?.replace(/_/g,'')) // deuxième tentative qui laisse plus d'éléments

			// Si on a pas trouvé de minuteur, ou qu'il n'a pas été créé par l'utilisateur, on arrête
			if(!timer) return interaction.reply({ content: `Aucun minuteur n'a été trouvé avec cet identifiant. Vérifier qu'il a bien été écrit, et que vous en êtes le créateur.`, ephemeral: true }).catch(err => {})
			if(timer?.authorId != interaction.user.id) return interaction.reply({ content: `Un minuteur a été trouvé avec cet identifiant mais vous n'en êtes pas son créateur, les informations sont donc indisponibles.`, ephemeral: true }).catch(err => {})

			// Créer un embed
			var listFields = [
				timer.userDuration ? { name: 'Durée', value: timer.userDuration, inline: true } : null,
				timer.startDate ? { name: 'Date de début', value: `<t:${Math.round(timer?.startDate / 1000)}:R>`, inline: true } : null,
				timer.endDate ? { name: 'Date de fin', value: `<t:${Math.round(new Date(timer?.endDate).getTime() / 1000)}:R>`, inline: true } : null,
				timer.reason ? { name: 'Raison', value: timer.reason, inline: true } : null,
				timer.timerId ? { name: 'Identifiant', value: `\`${timer.timerId}\``, inline: true } : null,
			]
			var embed = new EmbedBuilder()
			.setTitle("Détails du minuteur")
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
			.addFields(listFields.filter(field => field != null))

			// Créé un bouton si on veut supprimer
			var date = Date.now()
			const rowConfirm = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
				.setCustomId(`confirm-deleteTimer-${date}`)
				.setLabel('Supprimer')
				.setStyle(ButtonStyle.Danger)
			)
			buttonsIds.push({ customId: `confirm-deleteTimer-${date}`, interaction: interaction, authorId: interaction.user.id, timer: timer })

			// Répondre avec l'embed et les boutons
			interaction.reply({ embeds: [embed], components: [rowConfirm], ephemeral: true }).catch(err => {})
		}

		// Si on veut supprimer un minuteur
		if(interaction.options.getSubcommand() == 'delete'){
			// Obtenir l'identifiant du minuteur
			var timerId = interaction.options.getString('id')

			// Obtenir le minuteur associé à cet identifiant
			var timer = (await runningTimers()).find(timer => timer?.timerId == timerId && timer?.authorId == interaction.user.id)
			if(!timer) var timer = (await runningTimers()).find(timer => timer?.timerId?.toLowerCase()?.replace(/_/g,'') == timerId?.toLowerCase()?.replace(/_/g,'') && timer?.authorId == interaction.user.id) // deuxième tentative qui laisse plus d'éléments, tant que c'est la bonne personne

			// Si on a pas trouvé de minuteur
			if(!timer) return interaction.reply({ content: `Aucun minuteur n'a été trouvé avec cet identifiant. Vérifier qu'il a bien été écrit, et que vous en êtes le créateur.`, ephemeral: true }).catch(err => {})

			// Créer un embed
			var embed = new EmbedBuilder()
			.setTitle("Suppression d'un minuteur")
			.setDescription(`Le minuteur avec l'identifiant \`${timer?.timerId}\` qui s'arrête <t:${Math.round(new Date(timer?.endDate).getTime() / 1000)}:R>${timer?.reason?.length ? ` avec la raison "${timer?.reason?.replace(/`/g, '')?.replace(/"/g, '')}"` : ''} va être supprimé.`)
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))

			// Créé deux boutons pour confirmer qu'on sois sur
			var date = Date.now()
			const rowConfirm = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
				.setCustomId(`confirm-deleteTimer-${date}`)
				.setLabel('Confirmer')
				.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
				.setCustomId(`cancel-deleteTimer-${date}`)
				.setLabel('Finalement non')
				.setStyle(ButtonStyle.Danger),
			)
			buttonsIds.push({ customId: `confirm-deleteTimer-${date}`, interaction: interaction, authorId: interaction.user.id, timer: timer }, { customId: `cancel-deleteTimer-${date}`, interaction: interaction, interaction: interaction, authorId: interaction.user.id, timer: timer })

			// Répondre avec l'embed et les boutons
			interaction.reply({ embeds: [embed], components: [rowConfirm] }).catch(err => {})
		}
	}
}