const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, TextInputBuilder, ModalBuilder, TextInputStyle, EmbedBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('bachero.module.embed')
var botName = bacheroFunctions.config.getValue('bachero', 'botName')
var embedWithoutPermissions = bacheroFunctions.config.getValue('bachero.module.message', 'embedWithoutPermissions')
var embedShowAuthor = bacheroFunctions.config.getValue('bachero.module.message', 'embedShowAuthor')
var botClient
const fetch = require('node-fetch')
const nanoid = require('nanoid')

// Créé la commande slash
var slashInfo = new SlashCommandBuilder()
.setName('embed')
.setDescription(`Envoie un embed ${embedShowAuthor ? '' : 'anonymement '}sur le serveur en tant que ${botName}`)
.addStringOption(option => option.setName('source')
	.setDescription("Préremplit les informations à partir d'une source (identifiant, hastebin, Johan Text)")
	.setRequired(false))
if(!embedWithoutPermissions) slashInfo.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

// Fonction pour envoyer un message à partir d'une interaction
async function sendToChannel(interaction, embedInfos){
	// Mettre la réponse en defer
	if(await interaction.deferReply({ ephemeral: true }).catch(err => { return 'stop' }) == 'stop') return

	// Obtenir toute les options
	var title = interaction?.fields?.getTextInputValue('embedCommand-title') || embedInfos?.title
	var description = interaction?.fields?.getTextInputValue('embedCommand-description') || embedInfos?.description
	var footer = interaction?.fields?.getTextInputValue('embedCommand-footer') || embedInfos?.footer
	var color = interaction?.fields?.getTextInputValue('embedCommand-color') || embedInfos?.color

	// Générer un identifiant
	var uniqueId = nanoid()

	// Mettre dans la base de données
	bacheroFunctions.database.set(database, `embedId-${uniqueId}`, { title, description, footer, color })

	// Préparer une variable au cas où on a une remarque à faire plus tard
	var notes = []

	// Modifier la description
	if(description) description = description.replace(/\\n/g, '\n').replace(/%JUMP%/g, '\n').replace(/%DATE%/g, `<t:${Math.round(Date.now() / 1000)}:f>`)

	// Faire quelques vérifications
	if(!title && !description) return interaction.editReply({ content: "Vous devez entrer un titre ou une description lors de la création d'un embed" })
	if((title?.length + description?.length + footer?.length) > 6000) return interaction.editReply({ content: `Un embed ne peut pas dépasser la limite de 6000 caractères (titre, description et footer inclus), cependant votre embed contient un total de ${title.length + description.length + footer.length} caractères.\n${title.length ? '\n**Titre : **' + title.length + ' caractères' : ''}${description.length ? '\n**Description : **' + description.length + ' caractères' : ''}${footer.length ? '\n**Footer : **' + footer.length + ' caractères' : ''}` }).catch(err => {})

	// Déterminer la couleur à utiliser
		// Créé une liste de couleurs
		var alreadyDefinedColors = {
			'rouge': 'e00032',
			'vert': '12c700',
			'bleu': '01579b',
			'orange': 'ff6f00',
			'blanc': 'fafafa',
			'noir': '212121',
			'jaune': 'ffff00',
			'violet': '512da8',
			'cyan': '4fc3f7',
			'rose': 'ffafcc',
			'gris': 'f5f5f5',
			'grisfonce': '524b50',
			'marron': '604840',
			'saumon': 'f9906f',
		}

		// Si on a pas choisis de couleur, obtenir une au hasard parmis la liste
		if(!color) color = Object.keys(alreadyDefinedColors)[Math.floor(Math.random() * Object.keys(alreadyDefinedColors).length)]

		// Remplacer quelques mots dans la couleur pour une meilleure "compatibilité"
		color = color.toLowerCase().replace(/ /g,'').replace('red','rouge').replace('green','vert').replace('blue','bleu').replace('white','blanc').replace('black','noir').replace('yellow','jaune').replace('purple','violet').replace('grey','gris').replace('gray','gris').replace('brown','marron').replace('salmon','saumon').replace('foncé','fonce')

		// Vérifier si la couleur qu'on a choisis fait parti de la liste
		if(alreadyDefinedColors[color]) color = alreadyDefinedColors[color]

		// Sinon, vérifier si la couleur est une bonne couleur hexadécimale
		else if(!color?.length || (color?.length && !color?.replace('#','')?.match(/^[0-9a-f]{6}$/i))){
			// Définir par une couleur aléatoire de la liste
			colorName = Object.keys(alreadyDefinedColors)[Math.floor(Math.random() * Object.keys(alreadyDefinedColors).length)]
			color = alreadyDefinedColors[colorName]

			// Définir une note additionnelle
			notes.push(`Cette couleur n'est pas valide, je vais donc utiliser la couleur aléatoire : **${colorName}**.`)
		}

	// Créer l'embed
	var embed = new EmbedBuilder()
	if(title) embed.setTitle(title)
	if(description) embed.setDescription(description)
	if(footer) embed.setFooter({ text: footer })
	if(embedShowAuthor) embed.setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
	embed.setColor(color)

	// Obtenir le client du bot
	if(!botClient) botClient = bacheroFunctions.botClient.get()

	// Finir l'exécution
	try {
		// Envoyer l'embed
		botClient.channels.cache.get(interaction.channelId).send({ embeds: [embed] }).catch(err => {})

		// Obtenir une astuce
		var astucesList = ["Vous pouvez écrire `\\n` pour faire un saut de ligne.", "Pour un message classique, vous pouvez utiliser la commande `/say`.", embedShowAuthor ? null : "Personne ne sait que vous êtes l'auteur de cette commande 🤫", "Certains textes sont automatiquements remplacés par des raccourcis, vous pouvez écrire `%DATE%` pour ajouter la date du jour.", "Il est possible d'ajouter des liens cliquables dans la description : `[texte](lien)`", "Le champ permettant d'ajouter une couleur à l'embed accepte des couleurs hexédécimales"].filter(a => a != null)
		var randomAstuce = astucesList[Math.floor(Math.random() * astucesList.length)]

		// Répondre à l'interaction
		interaction.editReply({ content: `L'embed a été envoyé avec l'identifiant \`${uniqueId}\` !\n> **Tips :** ${notes.length ? notes.join(',') : randomAstuce}` }).catch(err => {})
	} catch(err) {
		return await bacheroFunctions.report.createAndReply("envoi du msesage", err, {}, interaction)
	}
}

// Exporter certaines fonctions
module.exports = {
	// Propriétés additionnelles
	slashToText: false,

	// Définir les infos de la commande slash
	slashInfo: slashInfo,

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le modal
	async interactionListener(listener){
		listener.on('modal', (interaction) => {
			if(interaction.customId != 'embedCommand-getEmbedInfos') return
			sendToChannel(interaction)
		})
	},

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Préparer les informations nécessaires pour l'embed
		var embedInfos = {}

		// Si on a entré une source
		var source = interaction.options.getString('source')
		if(source){
			// Tenter d'obtenir certaines sources
			source = { all: source }
			source.hastebin = source?.all?.match(/hastebin.com\/.{2,99}/g)?.toString()?.replace('hastebin.com/','')
			source.text = source?.all?.match(/text.johanstick.me\/v\/\d*-\w*/g)?.toString()?.replace('/v/','/raw/')

			// Si on a réussi à obtenir un hastebin, obtenir son contenu
			if(source?.hastebin){
				// Obtenir le contenu
				var content = await fetch(`https://hastebin.com/raw/${source.hastebin}`, { headers: { 'User-Agent': 'BacheroBot (+https://github.com/bacherobot/bot)' } }).then(res => res.text()).catch(err => { return { message: err } })

				// Si on arrive à parser en JSON, c'est qu'il y a une erreur
				try {
					content = JSON.parse(content)
				} catch(err){}
				if(typeof content == 'object') return await bacheroFunctions.report.createAndReply("obtention du hastebin", content?.message?.toString() || content, {}, interaction)

				// Sinon, définir les informations de l'embed
				embedInfos.description = content
			}

			// Si on a réussi à obtenir un hastebin, obtenir son contenu
			else if(source?.text){
				// Obtenir le contenu
				var content = await fetch(`https://${source.text}`, { headers: { 'User-Agent': 'BacheroBot (+https://github.com/bacherobot/bot)' } }).then(res => res.text()).catch(err => { return `/\\ ERREUR /\\\n\n${err}` })

				// Si il y a une erreur
				if(content?.toString()?.startsWith('/\\ ERREUR /\\')) return await bacheroFunctions.report.createAndReply("obtention du texte", content?.replace('/\\ ERREUR /\\\n\n','')?.toString() || content, {}, interaction)

				// Sinon, définir les informations de l'embed
				embedInfos.description = content
			}

			// Sinon, on vérifie que c'est pas l'identifiant d'un embed
			else if(source?.all){
				// Obtenir le contenu
				var content = (await bacheroFunctions.database.get(database, `embedId-${source.all}`)) || null
				
				// Si il existe, définir les informations de l'embed
				if(content) embedInfos = content
			}
		}

		// Vérifier les limites de caractères
		if(embedInfos?.title?.length > 256) embedInfos.title = embedInfos.title.substring(0, 256)
		if(embedInfos?.description?.length > 4000) embedInfos.description = embedInfos.description.substring(0, 4000)
		if(embedInfos?.footer?.text?.length > 2048) embedInfos.footer.text = embedInfos.footer.text.substring(0, 2048)
		if(embedInfos?.color?.length > 12) embedInfos.color = embedInfos.color.substring(0, 12)

		// Si on a déjà la description ou le titre
		if(embedInfos?.description || embedInfos?.title) return sendToChannel(interaction, embedInfos)

		// Créér un modal
		const modal = new ModalBuilder()
		.setCustomId('embedCommand-getEmbedInfos')
		.setTitle('Créer un embed')

		// Ajouter des champs dans le modal
		modal.addComponents(
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
				.setCustomId('embedCommand-title')
				.setLabel("Titre")
				.setPlaceholder("Titre, affiché tout en haut de l'embed")
				.setStyle(TextInputStyle.Short)
				.setRequired(false)
				.setMaxLength(256)
				.setValue(embedInfos.title || '')
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
				.setCustomId('embedCommand-description')
				.setLabel("Description")
				.setPlaceholder("Contenu principal de l'embed, avec une limite de caractère bien plus élevée qu'un message classique")
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false)
				.setMaxLength(4000)
				.setValue(embedInfos.description || '')
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
				.setCustomId('embedCommand-footer')
				.setLabel("Footer")
				.setPlaceholder("Informations supplémentaires, affiché tout en bas")
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false)
				.setMaxLength(2048)
				.setValue(embedInfos.footer || '')
			),
			new ActionRowBuilder().addComponents(
				new TextInputBuilder()
				.setCustomId('embedCommand-color')
				.setLabel("Couleur")
				.setPlaceholder("Ajoute une couleur via un code hexadécimal, ou parmi: rouge/vert/bleu/orange/blanc/noir/jaune/violet")
				.setStyle(TextInputStyle.Paragraph)
				.setRequired(false)
				.setMaxLength(12)
				.setValue(embedInfos.color || '')
			)
		)

		// Afficher le modal
		await interaction.showModal(modal).catch(err => {})
	}
}