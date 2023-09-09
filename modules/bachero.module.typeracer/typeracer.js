const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ContextMenuCommandBuilder, ApplicationCommandType } = require("discord.js")
const { rando } = require("@nastyox/rando.js")
const escape = require("markdown-escape")
const { diffWords } = require("diff")
const { colors } = require("../../functions")
const listPhrases = [
	{ text: "L'Homme est ci, l'Homme est ça, mais quand il commet l'homicide, l'Homme est sale.", source: "https://genius.com/Lefa-fils-dadam-lyrics" },
	{ text: "C'est bien beau de tourner des clips sur des yachts ou en hélico, ça c'est l'image, mais vos sons ont toujours besoin de soins médicaux.", source: "https://genius.com/Lefa-plus-ltime-lyrics" },
	{ text: "Il y aura du ciment sur mes mains pour bâtir ton avenir. Il y aura du sang sur mes mains si un homme te fait souffrir.", source: "https://genius.com/Soprano-je-serai-la-lyrics" },
	{ text: "Je n'ai pas révélé la moitié de ce que j'ai vu, car je savais qu'on ne me croirait pas...", source: "https://citation-celebre.leparisien.fr/citations/271852" },
	{ text: "Tu étais formidable, j'étais fort minable\nNous étions formidables", source: "https://genius.com/Stromae-formidable-lyrics" },
	{ text: "Cette fois c'était la dernière, tu peux croire que c'est qu'une crise.", source: "https://genius.com/Stromae-tous-les-memes-lyrics" },
	{ text: "Simius n'avait pas entendu, mais ses pensées cheminaient dans la même direction. Ils arrivaient aux premiers tombeaux de la nécropole. La porte sud de la ville.", source: null },
	{ text: "Pourquoi tu veux me mettre un bébé dans les bras ? J'ai déjà du mal à m'occuper de moi.", source: "https://genius.com/Orelsan-san-lyrics" },
	{ text: "Dans ce rap biz\nOn est arrivé les mains dans les poches\nA l'époque c'était \"envoie le beat\"\nOn fait le truc à l'arrache", source: "https://genius.com/Sniper-grave-dans-la-roche-lyrics" },
	{ text: "Garde le sourire, plus rien n'est grave\nTant qu'il nous reste une seconde de souvenir dans le crâne", source: "https://genius.com/Lomepal-trop-beau-lyrics" },
	{ text: "Ne fais pas ta joie du malheur d'autrui.\nIl n'est pas permis de blesser un ami, même en plaisantant.", source: null },
	{ text: "Je me sentais moins seule quand je ne te connaissais pas encore : j'attendais l'autre. Je ne pensais qu'à sa force et jamais à ma faiblesse.", source: "https://www.dicocitations.com/citations/citation-25293.php" },
	{ text: "Qui dit études dit travail, qui dit taf te dit tes thunes, qui dit argent dit dépenses, qui dit crédit dit créance, qui dit dette te dit huissier.", source: "https://genius.com/Stromae-alors-on-danse-lyrics" },
	{ text: "Et là tu t'dis que c'est fini\nCar pire que ça, ce serait la mort\nQuand tu crois enfin qu'tu t'en sors\nQuand y en a plus, et bah y en a encore", source: "https://genius.com/Stromae-alors-on-danse-lyrics" },
	{ text: "Donnez-moi une suite au Ritz, je n'en veux pas ! Des bijoux de chez Chanel, je n'en veux pas ! Donnez-moi une limousine, j'en ferais quoi ?", source: "https://genius.com/Zaz-je-veux-lyrics" },
	{ text: "Elle m'a aimé de tout son amour, de tout son coeur. Elle m'a donné tout ce qu'elle avait quand je n'étais rien.", source: "https://genius.com/Kendji-girac-elle-ma-aime-lyrics	" },
	{ text: "Ma raison somnolait, ma conscience me conseillait, mon subconscient m'déconseillait, mais mon esprit veut s'envoler.", source: "https://genius.com/Gims-zombie-lyrics" },
	{ text: "J'ai la colère des p'tits à qui on demande de choisir d'un coup leur métier, qui a conseillé la conseillère d'orientation ?", source: "https://genius.com/Nekfeu-humanoide-lyrics" },
	{ text: "Obligé d's'enterrer dans l'son, trouver une putain d'raison d'vivre\nJ'ai frappé dans les murs, mais ça résonne vide", source: "https://genius.com/Nekfeu-humanoide-lyrics" },
	{ text: "Un jour, ils ont commencé à menacer ma mif\nAlors je me suis armé par le biais d'un ami\nMais, Dieu merci, j'm'en suis jamais servi", source: "https://genius.com/Nekfeu-mauvaise-graine-lyrics" },
	{ text: "Aventurier de l'inconnu, avant tu riais de l'inconnu\nAvant tu riais du temps qui passe, et puis le temps est passé", source: "https://genius.com/Nekfeu-avant-tu-riais-lyrics" },
	{ text: "Ils disent que l'amour rend aveugle, mais il t'a redonné la vue\nIl t'a fait muer quand ta rage était sourde, il a fait fredonner la rue\nIl t'a fait retirer le collier de chien qui te servait d'écharpe", source: "https://genius.com/Nekfeu-avant-tu-riais-lyrics" },
	{ text: "Des Hommes de face désormais néfastes\nDes zones désolées, des hommes et des femmes\nTu te sens d'aucun des clans", source: "https://genius.com/Nekfeu-avant-tu-riais-lyrics" },
	{ text: "Ce soir, j'me mets minable, pourquoi j'me fais si mal ?\nJ'ai fait des rêves bizarres où tu changeais d'visage", source: "https://genius.com/Orelsan-reves-bizarres-lyrics" },
	{ text: "Ce soir, on ira faire un tour chez l'épicier ouvert en bas\nEt on parlera d'amour, entassés sur une véranda", source: "https://genius.com/Nekfeu-on-verra-lyrics" },
	{ text: "Combien d'fois j'ai volé par flemme de faire la queue ?", source: "https://genius.com/Nekfeu-on-verra-lyrics" },
	{ text: "Putain, bien sûr que j'me sens banane comme si le paradise m'avait mal accueilli\nJ'aimerais tellement que tu m'appelles juste pour pouvoir te raccrocher à la gueule", source: "https://genius.com/Lefa-paradise-lyrics" },
	{ text: "Le monde est à nous, le monde est à toi et moi", source: "https://genius.com/Damso-macarena-lyrics" },
	{ text: "Il fait le mec mature mais tu sais qu'au lit, plus que lui, j'assure", source: "https://genius.com/Damso-macarena-lyrics" },
	{ text: "Quand t'as démarré, qu't'es allée chez lui ben nan, j'ai rien dit\nPourtant, j'le savais qu'tu baisais pour t'évader, après tout, j''tais là qu'pour dépanner", source: "https://genius.com/Damso-macarena-lyrics" },
	{ text: "J'vais pas trop m'étaler, saigner fallait, blessé j'l'étais, j't'ai remballé, tu m'as remplacé, tu m'as délaissé", source: "https://genius.com/Damso-macarena-lyrics" },
	{ text: "À la base, j'ai commencé la musique juste pour voir\nJ'étais très différent de ceux qui cherchent plus de pouvoir\nJ'm'amusais à tester les plus grands qu'moi juste pour voir", source: "https://genius.com/Spri-noir-juste-pour-voir-lyrics" },
	{ text: "Juste pour voir, viens faire un tour dans nos têtes", source: "https://genius.com/Spri-noir-juste-pour-voir-lyrics" },
	{ text: "Si le monsieur dort dehors, c'est qu'il aime le bruit des voitures\nS'il s'amuse à faire le mort, c'est qu'il joue avec les statues", source: "https://genius.com/Orelsan-tout-va-bien-lyrics" },
	{ text: "Si la voisine crie très fort, c'est qu'elle a pas bien entendu", source: "https://genius.com/Orelsan-tout-va-bien-lyrics" },
	{ text: "Et si, un jour, ils ont disparu, c'est qu'ils s'amusaient tellement bien\nQu'ils sont partis loin faire une ronde, tous en treillis, main dans la main", source: "https://genius.com/Orelsan-tout-va-bien-lyrics" },
	{ text: "On trinque à nos balafres, à nos crochets tous les soirs.", source: "https://genius.com/Booba-92i-veyron-lyrics" },
	{ text: "Il me semble que je sombre depuis quelques mois\nTellement sombre que mon ombre est plus claire que moi", source: "https://genius.com/Nekfeu-energie-sombre-lyrics" },
	{ text: "Toute cette émotion fait que je sombre depuis quelques mois\nTellement sombre que mon ombre est plus claire que moi", source: "https://genius.com/Nekfeu-energie-sombre-lyrics" },
	{ text: "J'te préfère avec une balle dans la tête au moins j't'écouterai plus raconter ta vie", source: "https://genius.com/Damso-javais-juste-envie-decrire-lyrics" },
	{ text: "J'suis tellement loin que même les bruits qui courent se sont arrêtés", source: "https://genius.com/Damso-javais-juste-envie-decrire-lyrics" },
	{ text: "La voix de la sagesse est muette, elle parle en langage des signes", source: "https://genius.com/Damso-javais-juste-envie-decrire-lyrics" },
	{ text: "Sentiments égarés, on sourit pour ne pas pleurer", source: "https://genius.com/Damso-silence-lyrics" },
	{ text: "On s'oublie pour ne plus s'aimer, cherche la perfection pour fuir la réalité", source: "https://genius.com/Damso-silence-lyrics" },
	{ text: "Le vrai problème, c'est qu'à chaque fois qu'c'est le même problème", source: "https://genius.com/Damso-silence-lyrics" },
	{ text: "Je ne vois plus que des clones, ça a commencé à l'école\nÀ qui tu donnes de l'épaule pour t'en sortir ?", source: "https://genius.com/Nekfeu-nique-les-clones-part-ii-lyrics" },
	{ text: "Ici, tout l'monde joue des rôles en rêvant du million d'euros\nEt j'ai poussé comme une rose parmi les orties", source: "https://genius.com/Nekfeu-nique-les-clones-part-ii-lyrics" },
	{ text: "T'es malheureux quand t'as qu'un rêve et que tes parents ne veulent pas", source: "https://genius.com/Nekfeu-nique-les-clones-part-ii-lyrics" },
	{ text: "Non, je n'aime pas quand je me promène et que je vois\nCe petit qui se fait traquer pour des problèmes de poids", source: "https://genius.com/Nekfeu-nique-les-clones-part-ii-lyrics" },
	{ text: "T'as tes propres codes, t'as ta propre mode\nT'es tellement unique et ça c'est tout pour moi", source: "https://genius.com/Luidji-pour-deux-ames-solitaires-part-1-lyrics" },
	{ text: "Tu m'conseilles des séries, tu m'conseilles des films\nMais j'veux plus d'conseils, j'veux qu'on les mate ensemble", source: "https://genius.com/Luidji-pour-deux-ames-solitaires-part-1-lyrics" },
	{ text: "Tu réfléchis comme moi, souvent t'agis comme moi\nJ't'ai vu parler, penser, aimer\nJ't'ai vu rêver comme moi", source: "https://genius.com/Luidji-pour-deux-ames-solitaires-part-1-lyrics" },
	{ text: "Je me pose des questions sur le destin\nJe suis mon psy, ouais, mon propre médecin", source: "https://genius.com/Luidji-pour-deux-ames-solitaires-part-2-lyrics" },
	{ text: "Peut-être qu'elle se sert de moi pour oublier son ex hein\nMais j'me suis servi d'elle pour terminer mon texte hein", source: "https://genius.com/Luidji-pour-deux-ames-solitaires-part-2-lyrics" },
	{ text: "Maintenant j'suis tellement sûr de moi\nChaque fois que j'l'ouvre j'ai l'impression d'me vendre", source: "https://genius.com/Luidji-pour-deux-ames-solitaires-part-2-lyrics" },
	{ text: "J'avais trop de doutes et de questionnements, de motivations, de fréquentations\nMais j'ai médité assez longtemps", source: "https://genius.com/Luidji-pour-deux-ames-solitaires-part-2-lyrics" },
	{ text: "Ton corps m'inspire, fais ta valise, on s'tire", source: "https://genius.com/Jokair-las-vegas-lyrics" },
	{ text: "C'est comme ça, aucune meuf sur terre ne pourra m'changer\nTu n'es pas la première personne à avoir essayé", source: "https://genius.com/Jokair-las-vegas-lyrics" },
	{ text: "Pardonne-moi si j'suis une personne trop dure à aimer", source: "https://genius.com/Jokair-las-vegas-lyrics" },
	{ text: "J'accélère, on a la tête posée sur l'appuie-tête\nToute la nuit, les pneus brûlent sur la route 66", source: "https://genius.com/Jokair-las-vegas-lyrics" },
	{ text: "Au retour, mes draps avaient encore son odeur\nDur d'effacer nos souvenirs de ma tête", source: "https://genius.com/Jokair-nos-souvenirs-lyrics" },
]

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("typeracer")
		.setDescription("Défie un membre du serveur à un duel d'écriture")
		.setDMPermission(false)
		.addUserOption(option => option.setName("user")
			.setDescription("Adversaire à défier")
			.setRequired(true)),

	// Définir les infos du menu contextuel
	contextInfo: new ContextMenuCommandBuilder()
		.setName("Défier sur typeracer")
		.setType(ApplicationCommandType.User),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Obtenir l'adversaire
		var opponent = await interaction.options.getUser("user")
		var opponentMention = `<@${opponent?.id}>`

		// Empêcher la mention de certains types de personnes
		if(!opponent || !opponent.id) return interaction.reply({ content: "Tu dois mentionner un utilisateur valide !", ephemeral: true })
		if(opponent.bot) return interaction.reply({ content: "Beep boop, il n'est pas possible de défier un robot...", ephemeral: true })
		if(opponent.id == interaction.user.id) return interaction.reply({ content: "Tu ne peux pas défier toi-même, ça serait trop simple 🙃", ephemeral: true })

		// Générer un embed
		const embed = new EmbedBuilder()
			.setTitle("Demande de duel d'écriture")
			.setDescription(`${opponentMention}, **${interaction.user.discriminator == "0" ? escape(interaction.user.username) : escape(interaction.user.tag)}** vous défie à un duel d'écriture !\n\nUn texte sera envoyé, le premier à le recopier et l'envoyer dans ce salon deviendra vainqueur !`)
			.setFooter({ text: "Vous avez 30 secondes pour accepter cette demande" })
			.setColor(colors.primary)

		// Créé des boutons
		var date = Date.now()
		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`typeracer-accept-${date}`)
				.setStyle(ButtonStyle.Success)
				.setLabel("Accepter"),

			new ButtonBuilder()
				.setCustomId(`typeracer-deny-${date}`)
				.setStyle(ButtonStyle.Danger)
				.setLabel("Refuser"),
		)

		// Envoyer l'embed
		if(await interaction.reply({ embeds: [embed], components: [row] }).catch(err => { return "stop" }) == "stop") return

		// Quand quelqu'un clique sur le bouton
		const filter = inte => inte.user.id == opponent.id && (inte.customId == `typeracer-accept-${date}` || inte.customId == `typeracer-deny-${date}`)
		const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter, time: 30000 })
		collector.on("collect", async inte => {
			// Arrêter le collecteur
			collector.stop()

			// Si on refuse la demande
			if(inte.customId == `typeracer-deny-${date}`) return interaction.editReply({ embeds: [embed.setDescription(`La demande de duel a été refusé par ${opponentMention} !`).setFooter({ text: null })], components: [] }).catch(err => {})

			// Sinon, on dit que la demande a été accepté
			interaction.editReply({ embeds: [embed.setDescription("Demande de duel accepté, la partie va débuter dans quelques instants...").setFooter({ text: null })], components: [] }).catch(err => {})

			// Générer un texte à partir d'une liste
			var phrase = rando(listPhrases).value

			// Faire une copie du texte avec un caractère invisible tous les deux caractères par mot (ça évite le copier coller)
			var phraseAntiCP = ""
			var phraseSplited = phrase.text.split("")
			var invisibleChars = ["\u200B", "\u200C", "\u200D", "\u2060", "\uFEFF"]
			for(var i = 0; i < phraseSplited.length; i++){
				phraseAntiCP += phraseSplited[i]
				if(i % 2 == 0) phraseAntiCP += rando(invisibleChars).value
			}

			// Envoyer le message
			await interaction.editReply({ embeds: [embed.setTitle(`${interaction.user.username} VS ${opponent.username}`).setDescription(`> ${phraseAntiCP.replaceAll("\n", "\n> ")}`).setColor(colors.secondary)] }).catch(err => {})
			var dateStartGame = Date.now()

			// Attendre une réponse
			var messageToDelete = []
			const filter2 = m => m.author.id == interaction.user.id || m.author.id == opponent.id
			const collector2 = interaction.channel.createMessageCollector({ filter2, time: 120000 })
			collector2.on("collect", async m => {
				// Si l'auteur de ce message n'avait pas encore répondu
				if(collector2.collected.filter(msg => msg.author.id == m.author.id).size == 1){
					if(collector2.collected.size == 1) m.react("✅").catch(err => {})
					messageToDelete.push(m)
				}

				// Si les deux joueurs ont répondus
				if(collector2.collected.filter(m => m.author.id == interaction.user.id).size > 0 && collector2.collected.filter(m => m.author.id == opponent.id).size > 0) collector2.stop()
			})
			collector2.on("end", async (collected, reason) => {
				// Si le temps est écoulé
				if(reason == "time") interaction.editReply({ embeds: [new EmbedBuilder().setTitle("Duel d'écriture").setDescription("La partie vient de se terminer après deux minutes en raison d'une inactivité. Aucun vainqueur n'a pu être désigné.").setColor(colors.primary)] }).catch(err => {})

				// Sinon, on calcule la vitesse de chaque joueur
				else {
					// Récupérer les messages
					var message1 = collected.filter(m => m.author.id == interaction.user.id).first()
					var message2 = collected.filter(m => m.author.id == opponent.id).first()

					// Calculer le temps pris par chaque joueur pour répondre
					var taken1 = parseFloat(((message1.createdTimestamp - dateStartGame) / 1000).toFixed(2))
					var taken2 = parseFloat(((message2.createdTimestamp - dateStartGame) / 1000).toFixed(2))

					// Modifier le contenu des messages pour remplacer les caractères invisibles
					message1.content = message1.content.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, "*") // eslint-disable-line
					message2.content = message2.content.replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, "*") // eslint-disable-line

					// Déterminer le nombre d'erreurs dans le texte
					var errors1 = diffWords(message1.content.replace(/[^a-zA-Z0-9\*', çéêèà]/g, ""), phrase.text.replace(/[^a-zA-Z0-9', çéêèà\*]/g, ""), { ignoreCase: true }).length - 1 // eslint-disable-line
					var errors2 = diffWords(message2.content.replace(/[^a-zA-Z0-9\*', çéêèà]/g, ""), phrase.text.replace(/[^a-zA-Z0-9', çéêèà\*]/g, ""), { ignoreCase: true }).length - 1 // eslint-disable-line

					// Calculer un score en fonction du temps et du nombre d'erreurs
					var score1 = parseFloat((taken1 + (errors1 * 2)).toFixed(2))
					var score2 = parseFloat((taken2 + (errors2 * 2)).toFixed(2))

					// Déterminer le vainqueur
					var winner = "personne (égalité)"
					if(score1 < score2) winner = message1.author
					else if(score2 < score1) winner = message2.author

					// Construire un embed
					var embed = new EmbedBuilder()
						.setTitle("Duel d'écriture")
						.setDescription(`:tada: Victoire de **${winner}** !\n\n• ${message1.author} : ${taken1} secondes, ${errors1} erreur${errors1 > 1 ? "s" : ""}, ${score1} points\n• ${message2.author} : ${taken2} secondes, ${errors2} erreur${errors2 > 1 ? "s" : ""}, ${score2} points.`)
						.setColor(colors.primary)
						.setFooter({ text: phrase.source ? "Les résultats peuvent différer de la réalité en raison de latence avec Discord" : "Impossible de trouver la source de ce texte" })

					// Créer un bouton
					var button = new ButtonBuilder()
						.setURL(phrase.source || "https://bachero.johanstick.fr/404")
						.setStyle(ButtonStyle.Link)
						.setLabel("Source de la citation")
					if(!phrase.source) button.setDisabled()

					// Modifier l'interaction
					interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] }).catch(err => {})

					// Supprimer les messages qu'il faut supprimer
					messageToDelete.forEach(m => m.delete().catch(err => {}))
				}
			})
		})
		collector.on("end", async (collected, reason) => {
			if(reason == "time") interaction.editReply({ embeds: [embed.setDescription(`Aucune réponse de la part de ${opponentMention}, la demande de duel a expiré automatiquement.`).setFooter({ text: null })], components: [] }).catch(err => {})
		})
	}
}