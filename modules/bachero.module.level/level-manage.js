const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js')
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('bachero.module.level')
const escape = require('markdown-escape')

// Options de la configuration
const hideGlobalLeaderboard = bacheroFunctions.config.getValue('bachero.module.level', 'hideGlobalLeaderboard') || false
const showLevelUpMessage = bacheroFunctions.config.getValue('bachero.module.level', 'showLevelUpMessage')

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('level-manage')
		.setDescription('Gère le fonctionnement du système de niveaux et d\'XP sur votre serveur')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),

	// Récupérer le listener et savoir lorsque quelqu'un fait quelque chose
	async interactionListener(listener){
		// Pour les select menu
		listener.on('selectMenu', async (interaction) => {
			// Vérifier l'ids
			if(interaction.customId != 'levelManageMain' && !interaction.customId.startsWith('levelManage-userChangeXp-')) return;
			// Vérifier l'auteur puis defer l'interaction
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})

			// Si c'est le select principal
			if(interaction.customId == 'levelManageMain'){
				// On récupère la valeur
				var option = interaction.values[0]

				// Récupérer les infos de ce serveur
				var infos = (await bacheroFunctions.database.get(database, `guild-${interaction.guild.id}`)) || { globalLeaderboard: hideGlobalLeaderboard, levelUpMessage: showLevelUpMessage } // Si on a pas d'infos, on met la valeur par défaut

				// En fonction de l'option choisi
				if(option == 'globalLeaderboard'){ // Affichage du classement interserveur
					// Si l'option est activée
					if(infos.globalLeaderboard){
						// Désactiver
						infos.globalLeaderboard = false
						await bacheroFunctions.database.set(database, `guild-${interaction.guild.id}`, infos)

						// Envoyer un message
						await interaction.reply({ content: 'L\'affichage du classement interserveur a été désactivé', ephemeral: true }).catch(err => {})
					}

					// Si l'option est désactivée
					else {
						// Activer
						infos.globalLeaderboard = true
						await bacheroFunctions.database.set(database, `guild-${interaction.guild.id}`, infos)

						// Envoyer un message
						await interaction.reply({ content: 'L\'affichage du classement interserveur a été activé', ephemeral: true }).catch(err => {})
					}
				}

				else if(option == 'levelUpMessage'){ // Afficher le message de level-up
					// Si l'option est activée
					if(infos.levelUpMessage){
						// Désactiver
						infos.levelUpMessage = false
						await bacheroFunctions.database.set(database, `guild-${interaction.guild.id}`, infos)

						// Envoyer un message
						await interaction.reply({ content: 'L\'affichage du message de level-up a été désactivé', ephemeral: true }).catch(err => {})
					}

					// Si l'option est désactivée
					else {
						// Activer
						infos.levelUpMessage = true
						await bacheroFunctions.database.set(database, `guild-${interaction.guild.id}`, infos)

						// Envoyer un message
						await interaction.reply({ content: 'L\'affichage du message de level-up a été activé', ephemeral: true }).catch(err => {})
					}
				}

				else if(option == 'addXp' || option == 'removeXp'){ // Ajouter ou retirer de l'XP
					// Rangée
					const row = new ActionRowBuilder().addComponents(
						new UserSelectMenuBuilder()
						.setCustomId('levelManage-userChangeXp-' + option.replace('Xp',''))
						.setPlaceholder('Choissisez un utilisateur à éditer')
						.setMinValues(1)
						.setMaxValues(1)
					)

					// Envoyer un message
					await interaction.reply({ content: '> Le classement interserveur ne peut être changée. Vos modifications ne seront prises en compte que par le classement de votre serveur.', components: [row], ephemeral: true }).catch(err => {})
				}
			}

			// Si on veut éditer l'XP d'un utilisateur
			else if(interaction.customId.startsWith('levelManage-userChangeXp-')){
				// On récupère l'utilisateur et l'option
				var user = interaction.values[0]
				var option = interaction.customId.replace('levelManage-userChangeXp-', '')

				// Si le gars c'est un bot
				if(user == interaction.client.user.id) return interaction.reply({ content: 'Je ne peux pas m\'éditer moi-même !', ephemeral: true }).catch(err => {})
				if((await interaction.guild.members.fetch(user)).user.bot) return interaction.reply({ content: 'Je ne peux pas éditer un bot !', ephemeral: true }).catch(err => {})

				// On récupère les infos de l'utilisateur
				var userDb = (await bacheroFunctions.database.get(database, `user-${user}`)) || {}
				if(!userDb) return interaction.reply({ content: 'Cet utilisateur est inconnu de la base de données.', ephemeral: true }).catch(err => {})

				// On récupère ses infos sur ce serveur
				var userDbServer = userDb?.['server-' + interaction.guild.id] || { xp: 0, level: 0 }

				// On affiche un modal en réponse
				const modal = new ModalBuilder()
				.setCustomId(`levelManage-editXp-${option}-${user}`)
				.setTitle(option.replace('add', 'Ajout').replace('remove', 'Retrait') + " d'XP")
				.addComponents(
					new ActionRowBuilder().addComponents(
						new TextInputBuilder()
						.setCustomId('levelManage-xpQuantity')
						.setLabel(`Quantité d'XP à ${option.replace('add', 'ajouter').replace('remove', 'retirer')}`)
						.setPlaceholder(`L'utilisateur possède actuellement ${userDbServer?.xp} XP, et est niveau ${userDbServer?.level}`)
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true)
						.setMaxLength(10)
					)
				)
				await interaction.showModal(modal).catch(err => {})
				await interaction.deleteReply().catch(err => {})
			}
		})

		// Pour les modals
		listener.on('modal', async (interaction) => {
			if(!interaction.customId.startsWith('levelManage-editXp-')) return;
			if((interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.interaction?.user?.id) || (interaction?.message?.mentions?.repliedUser?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id)) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})

			// On récupère l'utilisateur et l'option
			var option = interaction.customId.split('-')[2]
			var user = interaction.customId.split('-')[3]
			var xpQuantity = interaction.fields.getTextInputValue('levelManage-xpQuantity') || interaction?.values?.[0]
			if(!user || !option || !xpQuantity) return interaction.reply(`debug: user: ${user}, option: ${option}, xp: ${xpQuantity}`).catch(err => {})

			// On vérifie que la quantité d'XP est valide
			if(isNaN(xpQuantity)) return interaction.reply({ content: 'La quantité d\'XP doit être un nombre.', ephemeral: true }).catch(err => {})
			if(!xpQuantity.match(/^[0-9]+$/)) return interaction.reply({ content: 'La quantité d\'XP doit être un nombre.', ephemeral: true }).catch(err => {})

			// On récupère les infos de l'utilisateur
			var userDb = (await bacheroFunctions.database.get(database, `user-${user}`)) || {}
			if(!userDb) return interaction.reply({ content: 'Cet utilisateur est inconnu de la base de données.', ephemeral: true }).catch(err => {})

			// On récupère ses infos sur ce serveur
			var userDbServer = userDb?.['server-' + interaction.guild.id] || { xp: 0, level: 0 }

			// On édite l'XP
			if(option == 'add') userDbServer.xp += parseInt(xpQuantity)
			else if(option == 'remove') userDbServer.xp -= parseInt(xpQuantity)

			// Si l'XP est négative, on la met à 0
			if(userDbServer.xp < 0) userDbServer.xp = 0

			// On modifie le niveau
			var newLevel_server = parseInt(userDbServer.xp / 1125)
			if(newLevel_server != userDbServer.level) userDbServer.level = newLevel_server

			// On définit dans la base de données
			if(!userDb?.['server-' + interaction.guild.id]) userDb['server-' + interaction.guild.id] = userDbServer
			else userDb['server-' + interaction.guild.id] = userDbServer
			await bacheroFunctions.database.set(database, `user-${user}`, userDb)

			// On envoie un message
			await interaction.reply({ content: `L'XP de <@${user}> a été modifiée. Il possède maintenant ${userDbServer.xp} XP et est niveau ${userDbServer.level}.`, ephemeral: true }).catch(err => {})
		})
	},

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Rangée
		const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
			.setCustomId('levelManageMain')
			.setPlaceholder('Choissisez un élément à configurer')
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Affichage du classement interserveur')
					.setDescription("Les utilisateurs peuvent toujours l'utiliser en message privé")
					.setValue('globalLeaderboard'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Afficher le message de level-up')
					.setDescription("Un message sera envoyé dans le tchat si quelqu'un monte en niveau")
					.setValue('levelUpMessage'),
				new StringSelectMenuOptionBuilder()
					.setLabel("Ajouter de l'XP")
					.setDescription("Permet d'ajouter une quantité d'XP à un utilisateur")
					.setValue('addXp'),
				new StringSelectMenuOptionBuilder()
					.setLabel("Retirer de l'XP")
					.setDescription("Permet d'enlever une quantité d'XP à un utilisateur")
					.setValue('removeXp'),
			)
		)

		// Répondre avec
		await interaction.reply({ components: [row], ephemeral: true })
	}
}