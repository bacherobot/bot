const { SlashCommandBuilder, PermissionFlagsBits, WebhookClient, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js')
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('bachero.module.fake')
const modalList = []

// Fonction pour obtenir/crée un webhook
async function getWebhook(interaction, forceRecreate=false){
	// Préparer une variable
	var webhookClient

	// Obtenir le webhook déjà existant pour ce salon
	var webhookInfo = await bacheroFunctions.database.get(database, `webhook-${interaction.channel.id}`)
	if(forceRecreate != true && webhookInfo?.id && webhookInfo?.token) try { webhookClient = new WebhookClient({ id: webhookInfo.id, token: webhookInfo.token }) } catch(err) { webhookClient = { error: err } }

	// Si on a pas de webhook, on le crée
	if(forceRecreate == true || !webhookClient || webhookClient?.error) var webhookInfo = await interaction.channel.createWebhook({ name: "Bachero Webhook", reason: `Un webhook a été créé par le module "bachero.module.fake" pour pouvoir utiliser la commande` }).catch(err => { return 'stop' })
	bacheroFunctions.database.set(database, `webhook-${interaction.channel.id}`, { id: webhookInfo.id, token: webhookInfo.token, lastUsed: Date.now() })
	try { webhookClient = new WebhookClient({ id: webhookInfo.id, token: webhookInfo.token }) } catch(err) { webhookClient = { error: err } }

	// Retourner le webhook
	if(webhookClient.error) return await bacheroFunctions.report.createAndReply("obtention du webhook Bachero", webhookClient.error, {}, interaction)
	return webhookClient
}

// Fonction pour envoyer un message dans un salon
async function sendToChannel(interaction){
	// On defer la réponse pour éviter les erreurs
	if(interaction.sourceType != 'textCommand' && await interaction.deferReply({ ephemeral: true }).catch(err => { return 'stop' }) == 'stop') return

	// Obtenir l'utilisateur mentionné, et le texte à envoyer
	var user = await interaction.options?.getUser('user') || modalList[interaction.user.id] || interaction.user
	var text = await interaction.options?.getString('text') || await interaction?.fields?.getTextInputValue('fakeCommand-text') || "Aucun texte fourni :/" // le "aucun texte fourni" devrais vraiment pas apparaître, c'est surtout AU CAS OU

	// Modifier et vérifier le texte
	text = text.replace(/\\n/g, '\n').replace(/%JUMP%/g, '\n').replace(/%DATE%/g, `<t:${Math.round(Date.now() / 1000)}:f>`)
	if(text.length > 1999) return interaction.editReply({ content: 'Votre message dépasse la limite de caractère (2000 caractères)' }).catch(err => {})

	// Obtenir le webhook, et l'utiliser pour envoyer un message
	var webhook = await getWebhook(interaction)
	webhook.send({ content: text, username: user?.username, avatarURL: await user.displayAvatarURL({ dynamic: true, size: 512 }) }).catch(async err => { // créer un webhookclient avec des informations invalides ne provoque pas d'erreur, donc on vérifie si les informations sont valides au moment d'envoyer le message (qui renvoie une erreur)
		// Donc si l'envoi a raté, on réessaie mais cette fois-ci en créant un nouveau webhook avant
		webhook = await getWebhook(interaction, true)
		webhook.send({ content: text, username: user?.username, avatarURL: await user.displayAvatarURL({ dynamic: true, size: 512 }) }).catch(async err => {
			return await bacheroFunctions.report.createAndReply("envoie d'un message avec le webhook", err, {}, interaction)
		})
	})

	// Si c'est une commande texte, tenter de supprimer le message d'invocation
	if(interaction.sourceType == 'textCommand'){
		try { interaction.delete().catch(err => {}) } catch(err) {} // Le choix de la sécurité
	}

	// Répondre à l'interaction
	if(interaction.sourceType != 'textCommand') return interaction.editReply({ content: `Message envoyé !` }).catch(err => {})
}

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('fake')
		.setDescription(`Usurpe l'identité d'un membre du serveur via un faux message`)
		.setDMPermission(false)
		.addUserOption(option => option.setName('user')
			.setDescription('Membre à usurper')
			.setRequired(true))
		.addStringOption(option => option.setName('text')
			.setDescription('Contenu du message à envoyer')
			.setRequired(true)
			.setMaxLength(1999)),

	// Définir les infos du menu contextuel
	contextInfo: new ContextMenuCommandBuilder()
	.setName("Usurper cet identité")
	.setType(ApplicationCommandType.User),

	// Quand le bot est connecté à Discord
	getClient(){
		setInterval(async () => {
			// Obtenir tous les webhooks dans la BDD
			var webhooks = await bacheroFunctions.database.getAll(database)

			// Pour chaque webhook, on vérifie la dernière fois qu'ils ont été utilisés
			Object.values(webhooks).forEach(async webhook => {
				// Si le webhook n'a pas été utilisé depuis plus de 10 minutes, on le supprime
				if(webhook.lastUsed < Date.now() - 600000){
					await bacheroFunctions.database.delete(database, `webhook-${Object.entries(webhooks).find(([key, value]) => value.id == webhook.id)?.[0]}`)
					try { var webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token }) } catch(err) { var webhookClient = { error: err } }
					if(!webhookClient.error) await webhookClient.delete().catch(err => { return 'stop' })
				}
			})
		}, 120000) // Vérifier toutes les 2 minutes s'il ne faut pas supprimer un/plusieurs webhooks
	},

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le modal
	async interactionListener(listener){
		listener.on('modal', (interaction) => {
			if(interaction.customId != 'fakeCommand-messageInfos') return
			sendToChannel(interaction)
		})
	},

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Vérifier que l'utilisateur a la permission d'utiliser cette commande, si le serveur n'a pas été configuré pour permettre à tout le monde de l'utiliser
		if(await bacheroFunctions.database.get(database, `everyoneUse-${interaction.guild.id}`) != true && !interaction.channel.permissionsFor(interaction.user).has(PermissionFlagsBits.ManageWebhooks)) return interaction.reply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission de gérer les webhooks dans ce salon.", ephemeral: true })

		// Si on a le contenu du message, on l'envoie
		if(await interaction.options.getString('text')) return sendToChannel(interaction)

		// Sinon, créer un modal pour le demander
		const modal = new ModalBuilder()
		.setCustomId('fakeCommand-messageInfos')
		.setTitle('Détail du message')
		.addComponents(
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
				.setCustomId('fakeCommand-text')
				.setLabel("Contenu")
				.setPlaceholder("Contenu du message à envoyer")
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(true)
				.setMaxLength(1999)
			)
		)

		// Ajouter dans la liste des modals l'utilisateur mentionné
		modalList[interaction.user.id] = await interaction.options.getUser('user')

		// Afficher le modal
		await interaction.showModal(modal).catch(err => {})
	}
}