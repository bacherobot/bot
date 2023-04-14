const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, WebhookClient, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js')
const Fuse = require('fuse.js');
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('bachero.module.fake')
const modalList = []

// Liste des profils prédéfinis
const profiles = {
	"DUOLINGO": { username: "Duo", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092527267877498950/f2a2e608c854822ad2563a09595e7827.png" },
	"BALDI": { username: "Professeur de français", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532477651845120/EPV1TB4So1lB0DGrdCVExDpNU8ML67nd8OqBeoOIM-s6sDicxmDdPvCXD6n7LKevFl0.png" },
    "LA_SPA": { username: "SPA", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532575135879300/Logo_de_la_SPA_28France29.png" },
    "REVEILLEUR": { username: "reveilleur de bot", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532685236355132/9c2fd7c0fdb7ad6521b94aa011f8d7d9.png" },
    "BEN": { username: "Ben", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532854870786078/BEN.png" },
    "DAME_PIED": { username: "Dame pied", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092513298022404261/dame_pied.png" },
    "MEE6": { username: "MEE6", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092513442394538004/Ea4pTA2G_400x400.png" },
    "MDRTUPEUTMEBAN": { username: "mdrtupeutmeban", avatarURL: "https://cdn.discordapp.com/embed/avatars/4.png" },
    "MDRMEBANPAS": { username: "mdrmebanpas", avatarURL: "https://cdn.discordapp.com/embed/avatars/2.png" },
    "RMXBOT": { username: "rmxBOT", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092513759068700772/d168a13f8f1441b61373c1af08a83632.png" },
    "STICKMAN": { username: "El stickmano", avatarURL: "https://avatars.githubusercontent.com/u/41506568" },
    "PH_KIDS": { username: "HUH", avatarURL: "https://media.discordapp.net/attachments/794895791248244746/815645712725311508/unknown.png" },
    "COURGETTE": { username: "Courgette 2.0", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532751648956626/82ad8a265847e14dd45eea7af635bffb.png" },
    "MMEPIPI": { username: "Mme Pipi", avatarURL: "https://media.discordapp.net/attachments/794895791248244746/815589628387262517/image0.png" },
    "FARES": { username: "Farès", avatarURL: "https://cdn.discordapp.com/attachments/794895791248244746/815645259559206922/t3D7q5tdFO7iHlAAAAAElFTkSuQmCC.png" },
    "TWITTER": { username: "Twitter", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092514413359140884/8CacHlnTEBYAAAAASUVORK5CYII.png" },
    "ELONMUSK": { username: "Elon Musk", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092523517171486801/IY9Gx6Ok_400x400.png" },
    "TRAIN": { username: "Train", avatarURL: "https://media.discordapp.net/attachments/574163441154129930/820605222506070046/x9kGZWNYAvFbgAAAABJRU5ErkJggg.png" },
    "ARBRE": { username: "Arbre", avatarURL: "https://media.discordapp.net/attachments/574163441154129930/820607154204966932/ABPd24EC89NPAAAAAElFTkSuQmCC.png" },
    "SFR": { username: "SFR", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092523835879854130/SFR-2022-logo.png" },
    "ORANGE": { username: "Orange", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092523931602264114/1200px-Orange_logo.png" },
    "FREE": { username: "Free", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092524309014138990/8nQ6eWDBleUuyJlNMwLIw0sr0RwEiwhLxkl06fVHUr905uxY18wd19AeTQf5NKh3ykMs94-rw.png" },
    "BOUYGUES": { username: "Bouygues Telecom", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092524421207560263/tfLdqFxQZyxGmovFghVjs8UCFZruYnEefOCxNlT3jNWC1sSy07WGQCAQCAQCgUAgEAgEAoFAIBAIBAKBQCAQ5PNfO5KhMTcczYAAAAASUVORK5CYII.png" },
    "SOSH": { username: "Sosh (orange moins cher mais toujours cher)", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092524563616772167/yH5_hrNN_400x400.png" },
    "VIDE": { username: "᲼᲼᲼᲼", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092513226232705055/empty.png" },
    "FIREFOX": { username: "Firefox", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092525175033057370/2048px-Firefox_brand_logo2C_2019.png" },
    "GOOGLE_CHROME": { username: "Google Chrome", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092525464804933824/Google_Chrome_icon_28February_202229.png" },
    "GOOGLE": { username: "Google", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092525595625279508/Google_22G22_Logo.png" },
    "ANDROID": { username: "Android", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092525910491672659/AG4niYo7WeWbAAAAAElFTkSuQmCC.png" },
    "APPLE": { username: "Apple", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092526075231359017/AfUxJHrbU9S5gAAAABJRU5ErkJggg.png" },
    "MICROSOFT": { username: "Microsoft", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092526141698490399/cropped-microsoft_logo_element.png" },
    "MICROSOFT_EDGE": { username: "Microsoft Edge", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092526228541538364/VYvJqGnrQiKkbbyLyMeiL-GM3go4tBIA64uVEGQazLXD4p_M3F45kHyt42o_6d5VXA.png" },
    "WINDOWS": { username: "Windows", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092526314436698212/windows_10_logo.png" },
    "LINUX": { username: "Linux", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092526831867023400/wdc0Z50rNWzZLGrdTX7VjzLrxHIab1KZjhMgQIAAAQIEHhV4AL6254GZsy8AAAAAElFTkSuQmCC.png" },
    "UBUNTU": { username: "Ubuntu", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092526886011273257/1200px-Logo-ubuntu_cof-orange-hex.png" },
    "DEBIAN": { username: "Debian", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092526927262265364/wfQ5huEkBj6xQAAAABJRU5ErkJggg.png" },
    "ZORINOS": { username: "ZorinOS", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092527096498241566/AgAIECBAgAABAgQyAgI6o2WWAAECBAgQIECgvICALr8CAAgQIECAAAECBDICAjqjZZYAAQIECBAgQKC8gIAuvwIACBAgQIAAAQIEMgICOqNllgABAgQIECBAoLzAvwCv9ru9zypcXQAAAABJRU5ErkJggg.png" },
    "FENETRE": { username: "Fenêtre", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092527123069157426/th.png" },
    "VLC": { username: "VLC", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092527237804339200/nPnJc260PPoupBe-DcVQ-MNr6149dphdEoEAN-C9xwgctpVXbwsuyon_jEZ3uPWWYQ.png" },
    "PAMELA": { username: "Pamela", avatarURL: "https://cdn.discordapp.com/attachments/574163441154129930/849548936065712138/photoRandom1.jpg" },
    "ENTREPRENEUR": { username: "Salut à toi jeune entrepreneur", avatarURL: "https://cdn.discordapp.com/attachments/574163441154129930/849549289335029810/4b5510ab3b04511104fbefafcb9ed66e.png" },
    "MBOT": { username: "Mbot", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092528533433229394/robot-educatif-mbot-v11-bleu-stem.png" },
    "MBOT_ROSE": { username: "Mbotte", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092528533143818290/rBVapWAzWCWAWiy9AAFUJCixmdY086.png" },
    "ETHANLINK": { username: "EthanLink", avatarURL: "https://cdn.discordapp.com/attachments/574163441154129930/849550233565265920/6121bec6deeaee9698227879ae76715d.png" },
    "JAQUE_DE_LA_COMPTA": { username: "Jaque de la compta", avatarURL: "https://cdn.discordapp.com/attachments/574163441154129930/849550649238093824/a3bfbd66198b46d22b2b0e432e559491.png" },
    "RICHE": { username: "Lucas", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092527807541817414/x9aANYdH8Sz8gAAAABJRU5ErkJggg.png" },
    "POUVOIR_AGIR": { username: "Le pouvoir d'agir", avatarURL: "https://media.discordapp.net/attachments/1092512692499120280/1092527921937260644/gYM4lOUiB3YHDpq2BA7iUJYv4cAscJYMqiGKgIHK0fiqxvkHIQI6plvQGmIAAAAASUVORK5CYII.png" },
    "POUVOIR_ACHAT": { username: "Le pouvoir d'achat", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092528154779848815/wAKkq9jHblFgAAAABJRU5ErkJggg.png" },
    "OEUF_CSGO": { username: "Oœuf tah Counter Strike", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092528339257937920/48AlggAAAABJRU5ErkJggg.png" },
    "BICHE": { username: "Biche", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092528701855498240/NuO2xP8LHEOIgg684AAAAASUVORK5CYII.png" },
    "STOP": { username: "STOP", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092528633303793714/fotolia_52571087.png" },
    "ANTI_COUPABLE": { username: "Anti Coupable", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092528779076849745/favicon.png" },
    "ELWATCH": { username: "ElWatch", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092529058841104434/elwatch.png" },
    "ELWATCH_V1": { username: "ElWatch Online Bot", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092529458759610368/fJeSf2nyZkAAAAASUVORK5CYII.png" },
    "ECOCHAT": { username: "EcoChat", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092529557472559264/Ecochat.png" },
    "BEBOU_CHOCOLAT": { username: "Bebou au chocolat", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092530755848122498/Z.png" },
    "SHREK": { username: "Shrek", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092531123390791720/ydWqDe1xZQTwAAAABJRU5ErkJggg.png" },
    "TOMATO_VPN": { username: "Tomato VPN", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092530995674239026/rqhofMRZtuNDjVNkQRkV2bHRp5htWv_TrUlPXBoef8rQzKOJ4ThWKBW4xRxclhyWd7M.png" },
    "BIO_CLEAN": { username: "Bio clean", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092531811088875520/bio_clean.png" },
    "PLANETE_STICKMAN": { username: "Planète stickman", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092531836967718982/planete_stickman.png" },
    "ELBOT": { username: "elbot", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532047182053407/elbot.jpg" },
    "ELBOT_TEST": { username: "Elbot test", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532047689568286/elbot_test.jpeg" },
    "ELBOT_V1": { username: "elbot v1", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532048171900968/elbot_v1.jpeg" },
    "ELBOT_V1_TRISTE": { username: "elbot v1", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532048461316237/elbot_v1_triste.jpeg" },
    "ELBOT_ANNIVERSAIRE": { username: "elbot", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532194108514334/elbotanniversaire.png" },
    "ELBOT_BONNEANNEE": { username: "elbot", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532194410500217/elbotbonneannee.png" },
    "ELBOT_NOEL": { username: "elbot", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532271346622594/elbotdenoel.jpg" },
    "ELBOT_NOIR": { username: "elbot mange ton âme", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532194997698570/elbot_degrade_nwarr.png" },
    "BASSINE": { username: "Bassine", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532365999472730/Vide.png" },
    "CONTROLEUR": { username: "yaz2le", avatarURL: "https://cdn.discordapp.com/attachments/1092512692499120280/1092532460614586439/kZqR3QAAAAASUVORK5CYII.png" },
}

// Pouvoir rechercher un profil prédéfini avec Fuse.js
var fuse = new Fuse(Object.entries(profiles).map(([key, value]) => ({ ...value, id: key })), {
	includeScore: true,
	shouldSort: true,
	distance: 200,
	threshold: 0.6,
	keys: [
		{
			name: 'username',
			weight: 0.5
		},
		{
			name: 'id',
			weight: 0.6
		}
	]
})

// Fonction pour obtenir/crée un webhook
async function getWebhook(interaction, forceRecreate=false){
	// Préparer une variable
	var webhookClient

	// Obtenir le webhook déjà existant pour ce salon
	var webhookInfo = await bacheroFunctions.database.get(database, `webhook-${interaction.channel.id}`)
	if(forceRecreate != true && webhookInfo?.id && webhookInfo?.token) try { webhookClient = new WebhookClient({ id: webhookInfo.id, token: webhookInfo.token }) } catch(err) { webhookClient = { error: err } }

	// Si on a pas de webhook, on le crée
	if(forceRecreate == true || !webhookClient || webhookClient?.error) var webhookInfo = await interaction.channel.createWebhook({ name: "Bachero Webhook", reason: `Un webhook a été créé par le module "bachero.module.fake" pour pouvoir utiliser la commande` }).catch(err => { return { error: err } })
	if(webhookInfo.error) return await bacheroFunctions.report.createAndReply("création du webhook Bachero", webhookInfo.error, {}, interaction)
	bacheroFunctions.database.set(database, `webhook-${interaction.channel.id}`, { id: webhookInfo.id, token: webhookInfo.token, lastUsed: Date.now() })
	try { webhookClient = new WebhookClient({ id: webhookInfo.id, token: webhookInfo.token }) } catch(err) { webhookClient = { error: err } }

	// Retourner le webhook
	if(webhookClient.error) return await bacheroFunctions.report.createAndReply("obtention du webhook Bachero", webhookClient.error, {}, interaction)
	return webhookClient
}

// Fonction pour envoyer un message dans un salon
async function sendToChannel(interaction, userToFake){
	// On defer la réponse pour éviter les erreurs
	if(interaction.sourceType != 'textCommand' && await interaction.deferReply({ ephemeral: true }).catch(err => { return 'stop' }) == 'stop') return

	// Obtenir l'utilisateur mentionné, et le texte à envoyer
	var user = userToFake || modalList[interaction.user.id]
	var text = await interaction.options?.getString('text') || await interaction?.fields?.getTextInputValue('fakeCommand-text') || "Aucun texte fourni :/" // le "aucun texte fourni" devrais vraiment pas apparaître, c'est surtout AU CAS OU

	// Modifier et vérifier le texte
	text = text.replace(/\\n/g, '\n').replace(/%JUMP%/g, '\n').replace(/%DATE%/g, `<t:${Math.round(Date.now() / 1000)}:f>`)
	if(text.length > 1999) return interaction.editReply({ content: 'Votre message dépasse la limite de caractère (2000 caractères)' }).catch(err => {})

	// Obtenir le webhook, et l'utiliser pour envoyer un message
	var webhook = await getWebhook(interaction)
	if(!webhook.send) return; // si on a pas de webhook, on arrête là (ptet que la fonction a retourné un rapport d'erreur)
	await webhook.send({ content: text, username: user?.username, avatarURL: user?.avatarURL }).catch(async err => { // créer un webhookclient avec des informations invalides ne provoque pas d'erreur, donc on vérifie si les informations sont valides au moment d'envoyer le message (qui renvoie une erreur)
		// Donc si l'envoi a raté, on réessaie mais cette fois-ci en créant un nouveau webhook avant
		webhook = await getWebhook(interaction, true)
		webhook.send({ content: text, username: user?.username, avatarURL: user?.avatarURL }).catch(async err => {
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
		.setDescription("Envoie un message sous une autre identité, via un webhook")
		.setDMPermission(false)
		.addSubcommand((subcommand) => subcommand
			.setName('mention')
			.setDescription("Usurpe l'identité d'un membre du serveur")
			.addUserOption(option => option.setName('user')
				.setDescription('Membre à usurper')
				.setRequired(true))
			.addStringOption(option => option.setName('text')
				.setDescription('Contenu du message à envoyer')
				.setRequired(false)
				.setMaxLength(1999))
		)
		.addSubcommand((subcommand) => subcommand
			.setName('custom')
			.setDescription("Usurpe l'identité à partir d'un profil prédéfini")
			.addStringOption(option => option.setName('id')
				.setDescription("Identifiant du profil prédéfini, n'entrer aucun argument pour obtenir la liste")
				.setRequired(false))
			.addStringOption(option => option.setName('text')
				.setDescription('Contenu du message à envoyer')
				.setRequired(false)
				.setMaxLength(1999))
		),

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
				// Si le webhook n'a pas d'identifiant ou de token, on le supprime juste de la BDD
				if(!webhook.id || !webhook.token) return await bacheroFunctions.database.delete(database, Object.entries(webhooks).find(w => w[1] == webhook)?.[0])

				// Si le webhook n'a pas été utilisé depuis plus de 10 minutes, on le supprime
				if(webhook.lastUsed < Date.now() - 600000){
					await bacheroFunctions.database.delete(database, Object.entries(webhooks).find(([key, value]) => value.id == webhook.id)?.[0])
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

		// Préparer l'utilisateur
		var userToFake

		// Si on utilise un profil prédéfini, on vérifie que l'identifiant est valide
		var profilId = await interaction.options.getString('id')
		if(profilId) profilId = profilId.toUpperCase()
		if(profilId && profiles[profilId]) userToFake = profiles[profilId]

		// Si on a pas d'utilisateur, alors que la sous commande est "custom"
		if(!userToFake && profilId && await interaction.options.getSubcommand() == 'custom'){
			var results = fuse.search(await interaction.options.getString('id'))
			if(results?.length) results.sort((a, b) => { return a.score - b.score })
			userToFake = results[0]?.item
		}

		// Si on a toujours pas d'utilisateur, alors qu'on a entré un identifiant
		if(!userToFake && profilId) return interaction.reply({ content: "Aucun profil prédéfinis n'est associé à cet identifiant, vous pouvez refaire la commande sans aucun argument pour obtenir la liste.", ephemeral: true }).catch(err => {})

		// Si on a pas d'utilisateur à usurper, on essaye autrement
		if(!userToFake) userToFake = {
			username: (await interaction.options.getUser('user'))?.username,
			avatarURL: (await interaction.options.getUser('user'))?.avatarURL({ dynamic: true, size: 512 })
		}

		// Si on a pas d'utilisateur, on provient forcément de la sous commande "custom" (car la sous commande "mention" a besoin d'un utilisateur)
		if(!userToFake?.username){
			var embed = new EmbedBuilder()
			.setTitle("Liste des profils prédéfinis")
			.setDescription(Object.entries(profiles).map(([key, value]) => `**${key}**   :   « ${value.username} »`).join('\n').substring(0, 3900))
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
			.setFooter({ text: `${Object.entries(profiles).length} profils ont été trouvés` })
			return interaction.reply({ embeds: [embed], ephemeral: true }).catch(err => {})
		}

		// Si on a le contenu du message, on l'envoie
		if(await interaction.options.getString('text')) return sendToChannel(interaction, userToFake)

		// Sinon, on vérifie qu'on peut afficher un modal
		if(interaction.sourceType == 'textCommand') return interaction.reply({ content: "L'argument `text` est manquant dans votre commande, vous devez l'ajouter à votre message. Sinon, vous pouvez aussi utiliser une commande slash (/) pour afficher un menu permettant la saisie du texte sans ajouter d'argument à votre message." }).catch(err => {})

		// Puis on le crée si c'est bon
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
		modalList[interaction.user.id] = userToFake

		// Afficher le modal
		await interaction.showModal(modal).catch(err => {})
	}
}