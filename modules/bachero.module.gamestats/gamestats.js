const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, escapeMarkdown } = require("discord.js")
const prettyMilliseconds = require("pretty-ms")
const path = require("path")
const bacheroFunctions = require("../../functions")

const monkeytype = require(path.join(bacheroFunctions.foldersPath.modules, "bachero.module.gamestats", "monkeytype"))
const clashroyale = require(path.join(bacheroFunctions.foldersPath.modules, "bachero.module.gamestats", "clashroyale"))
const brawlstars = require(path.join(bacheroFunctions.foldersPath.modules, "bachero.module.gamestats", "brawlstars"))
const clashofclans = require(path.join(bacheroFunctions.foldersPath.modules, "bachero.module.gamestats", "clashofclans"))
const paladium = require(path.join(bacheroFunctions.foldersPath.modules, "bachero.module.gamestats", "paladium"))

// Ajouter un espace tous les 3 chiffres
function addSpaceNumbers(number){
	return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
}

// Cache
var cache
if(global.gamestatsCache) cache = global.gamestatsCache
else {
	const NodeCache = require("node-cache")
	cache = new NodeCache()
	global.gamestatsCache = cache
}

// Liste des commandes slash
var slashInfo = new SlashCommandBuilder()
	.setName("gamestats")
	.setDescription("Obtient des statistiques sur un joueur parmis plusieurs jeux")
	.addSubcommand((subcommand) => subcommand
		.setName("monkeytype")
		.setDescription("Affiche des statistiques sur un compte MonkeyType")
		.addStringOption(option => option.setName("username")
			.setDescription("Nom d'utilisateur du compte")
			.setMaxLength(100)
			.setRequired(true)))
	.addSubcommand((subcommand) => subcommand
		.setName("paladium")
		.setDescription("Affiche des statistiques sur un joueur de Paladium Java")
		.addStringOption(option => option.setName("username")
			.setDescription("Nom d'utilisateur du compte Minecraft")
			.setMaxLength(100)
			.setRequired(true)))

// Rajouter des sous-commandes en fonction des clés d'APIs disponibles
if(process.env.CLASHROYALE_API_KEY) slashInfo.addSubcommand((subcommand) => subcommand
	.setName("clashroyale")
	.setDescription("Affiche des statistiques sur un tag Clash Royale")
	.addStringOption(option => option.setName("tag")
		.setDescription("Tag du compte, affichée sur votre profil")
		.setMaxLength(100)
		.setRequired(true)))

if(process.env.BRAWLSTARS_API_KEY) slashInfo.addSubcommand((subcommand) => subcommand
	.setName("brawlstars")
	.setDescription("Affiche des statistiques sur un tag Brawl Stars")
	.addStringOption(option => option.setName("tag")
		.setDescription("Tag du compte, affichée sur votre profil")
		.setMaxLength(100)
		.setRequired(true)))

if(process.env.CLASHOFCLANS_API_KEY) slashInfo.addSubcommand((subcommand) => subcommand
	.setName("clashofclans")
	.setDescription("Affiche des statistiques sur un tag Clash of Clans")
	.addStringOption(option => option.setName("tag")
		.setDescription("Tag du compte, affichée sur votre profil")
		.setMaxLength(100)
		.setRequired(true)))

module.exports = {
	// Définir les infos de la commande slash
	slashInfo,

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le bouton
	async interactionListener(listener){
		listener.on("button", (interaction) => {
			// Afficher les cartes (Clash Royale)
			if(interaction.customId.startsWith("clashroyale-showCards-")){
				bacheroFunctions.showDebug(`Bouton utilisé (${interaction.customId})`)
				var tag = interaction.customId.replace("clashroyale-showCards-", "")
				var userData

				// Chercher depuis le cache
				bacheroFunctions.showDebug(`Recherche dans le cache (${tag})`)
				if(cache.has(`cr-${tag}`)) userData = cache.get(`cr-${tag}`)
				else return interaction.reply({ content: "Le délai maximal a été dépassé, réutiliser la commande puis appuyer sur le bouton.", ephemeral: true })

				// Créer la description
				bacheroFunctions.showDebug("Génération d'une description")
				var embedDescription = userData?.cards?.map(card => `${escapeMarkdown(card.name)} : niveau ${card.level}/${card.maxLevel} (${clashroyale.cardsRarity[card.rarity]})`).join("\n")
				if(embedDescription.length > 2048){
					bacheroFunctions.showDebug("Description trop longue, génération d'une autre description plus courte")
					embedDescription = userData?.cards?.map(card => `${escapeMarkdown(card.name)} : niveau ${card.level}/${card.maxLevel}`).join("\n")
				}

				// Créer l'embed
				var embed = new EmbedBuilder()
					.setTitle(`Cartes de ${userData.name || tag} — Clash Royale`)
					.setDescription(embedDescription.length > 2048 ? `${embedDescription.slice(0, 2045)}...` : embedDescription)
					.setFooter({ text: `Données fournies par Clash Royale${embedDescription.length > 2048 ? " • trop long pour être affiché entièrement" : ""}` })
					.setColor(bacheroFunctions.colors.primary)

				interaction.reply({ embeds: [embed], ephemeral: true })
			}

			// Afficher les brawlers (Brawl Stars)
			else if(interaction.customId.startsWith("brawlstars-showBrawlers-")){
				bacheroFunctions.showDebug(`Bouton utilisé (${interaction.customId})`)
				var tag = interaction.customId.replace("brawlstars-showBrawlers-", "")
				var userData

				// Chercher depuis le cache
				bacheroFunctions.showDebug(`Recherche dans le cache (${tag})`)
				if(cache.has(`bs-${tag}`)) userData = cache.get(`bs-${tag}`)
				else return interaction.reply({ content: "Le délai maximal a été dépassé, réutiliser la commande puis appuyer sur le bouton.", ephemeral: true })

				// Créer la description
				bacheroFunctions.showDebug("Génération d'une description")
				var embedDescription = userData?.brawlers?.map(brawler => `${escapeMarkdown(brawler.name)} : ${brawler.trophies} trophée${brawler.trophies > 1 ? "s" : ""} (+ haut : ${brawler.highestTrophies})`).join("\n")
				if(embedDescription.length > 2048){
					bacheroFunctions.showDebug("Description trop longue, génération d'une autre description plus courte")
					embedDescription = userData?.brawlers?.map(brawler => `${escapeMarkdown(brawler.name)} : ${brawler.trophies} trophée${brawler.trophies > 1 ? "s" : ""}`).join("\n")
				}

				// Créer l'embed
				var embed = new EmbedBuilder()
					.setTitle(`Cartes de ${userData.name || tag} — Brawl Stars`)
					.setDescription(embedDescription.length > 2048 ? `${embedDescription.slice(0, 2045)}...` : embedDescription)
					.setFooter({ text: `Données fournies par Brawl Stars${embedDescription.length > 2048 ? " • trop long pour être affiché entièrement" : ""}` })
					.setColor(bacheroFunctions.colors.primary)

				interaction.reply({ embeds: [embed], ephemeral: true })
			}

			// Afficher les troupes (Clash of Clans)
			else if(interaction.customId.startsWith("clashofclans-troops-")){
				bacheroFunctions.showDebug(`Bouton utilisé (${interaction.customId})`)
				var tag = interaction.customId.replace("clashofclans-troops-", "")
				var userData

				// Chercher depuis le cache
				bacheroFunctions.showDebug(`Recherche dans le cache (${tag})`)
				if(cache.has(`coc-${tag}`)) userData = cache.get(`coc-${tag}`)
				else return interaction.reply({ content: "Le délai maximal a été dépassé, réutiliser la commande puis appuyer sur le bouton.", ephemeral: true })

				// Trier les troupes en fonction de leur niveau
				var troops = userData?.troops?.sort((a, b) => b.level - a.level)
				var villageTroops = troops?.filter(troop => troop.village == "home")
				var builderBaseTroops = troops?.filter(troop => troop.village == "builderBase")

				// Créer la description
				bacheroFunctions.showDebug("Génération d'une description")
				var embedDescription = `**Village principal :**\n\n${villageTroops?.map(troop => `${escapeMarkdown(troop.name)} : niveau ${troop.level}/${troop.maxLevel}`).join("\n") || "Aucune."}\n\n**Village ouvrier :**\n\n${builderBaseTroops?.map(troop => `${escapeMarkdown(troop.name)} : niveau ${troop.level}/${troop.maxLevel}`).join("\n") || "Aucune."}`
				if(embedDescription.length > 2048){
					bacheroFunctions.showDebug("Description trop longue, génération d'une autre description plus courte")
					embedDescription = troops?.map(troop => `${escapeMarkdown(troop.name)} : niveau ${troop.level} (${clashofclans.villageNames[troop.village].replace("Village ", "")})`).join("\n") || "Aucune."
				}

				// Créer l'embed
				var embed = new EmbedBuilder()
					.setTitle(`Troupes de ${userData.name || tag} — Clash of Clans`)
					.setDescription(embedDescription.length > 2048 ? `${embedDescription.slice(0, 2045)}...` : embedDescription)
					.setFooter({ text: `Données fournies par Clash of Clans${embedDescription.length > 2048 ? " • trop long pour être affiché entièrement" : ""}` })
					.setColor(bacheroFunctions.colors.primary)

				interaction.reply({ embeds: [embed], ephemeral: true })
			}

			// Afficher les héros (Clash of Clans)
			else if(interaction.customId.startsWith("clashofclans-heroes-")){
				bacheroFunctions.showDebug(`Bouton utilisé (${interaction.customId})`)
				var tag = interaction.customId.replace("clashofclans-heroes-", "")
				var userData

				// Chercher depuis le cache
				bacheroFunctions.showDebug(`Recherche dans le cache (${tag})`)
				if(cache.has(`coc-${tag}`)) userData = cache.get(`coc-${tag}`)
				else return interaction.reply({ content: "Le délai maximal a été dépassé, réutiliser la commande puis appuyer sur le bouton.", ephemeral: true })

				// Trier les héros en fonction de leur niveau
				var heroes = userData?.heroes?.sort((a, b) => b.level - a.level)

				// Créer la description
				bacheroFunctions.showDebug("Génération d'une description")
				var embedDescription = heroes?.map(hero => `**${escapeMarkdown(hero.name)}** :\n> Niveau : ${hero.level}/${hero.maxLevel}\n> Equipement : ${hero?.equipment?.map(eq => `${escapeMarkdown(eq.name)} (niveau ${eq.level}/${eq.maxLevel})`).join(" ; ") || "Aucun"}\n> Village : ${clashofclans.villageNames[hero.village]}`).join("\n\n") || "Aucun."
				if(embedDescription.length > 2048){
					bacheroFunctions.showDebug("Description trop longue, génération d'une autre description plus courte")
					embedDescription = heroes?.map(hero => `${escapeMarkdown(hero.name)} : niveau ${hero.level} (${clashofclans.villageNames[hero.village].replace("Village ", "")})`).join("\n") || "Aucun."
				}

				// Créer l'embed
				var embed = new EmbedBuilder()
					.setTitle(`Héros de ${userData.name || tag} — Clash of Clans`)
					.setDescription(embedDescription.length > 2048 ? `${embedDescription.slice(0, 2045)}...` : embedDescription)
					.setFooter({ text: `Données fournies par Clash of Clans${embedDescription.length > 2048 ? " • trop long pour être affiché entièrement" : ""}` })
					.setColor(bacheroFunctions.colors.primary)

				interaction.reply({ embeds: [embed], ephemeral: true })
			}

			// Afficher les sorts (Clash of Clans)
			else if(interaction.customId.startsWith("clashofclans-spells-")){
				bacheroFunctions.showDebug(`Bouton utilisé (${interaction.customId})`)
				var tag = interaction.customId.replace("clashofclans-spells-", "")
				var userData

				// Chercher depuis le cache
				bacheroFunctions.showDebug(`Recherche dans le cache (${tag})`)
				if(cache.has(`coc-${tag}`)) userData = cache.get(`coc-${tag}`)
				else return interaction.reply({ content: "Le délai maximal a été dépassé, réutiliser la commande puis appuyer sur le bouton.", ephemeral: true })

				// Trier les sorts en fonction de leur niveau
				var spells = userData?.spells?.sort((a, b) => b.level - a.level)
				var villageSpells = spells?.filter(spell => spell.village == "home")
				// var builderBaseSpells = spells?.filter(spell => spell.village == "builderBase") // y'a pas de sorts pour la base des ouvriers

				// Créer la description
				bacheroFunctions.showDebug("Génération d'une description")
				var embedDescription = `**Village principal :**\n\n${villageSpells?.map(spell => `${escapeMarkdown(spell.name)} : niveau ${spell.level}/${spell.maxLevel}`).join("\n") || "Aucun."}`
				if(embedDescription.length > 2048){
					bacheroFunctions.showDebug("Description trop longue, génération d'une autre description plus courte")
					embedDescription = spells?.map(spell => `${escapeMarkdown(spell.name)} : niveau ${spell.level}`).join("\n") || "Aucun."
				}

				// Créer l'embed
				var embed = new EmbedBuilder()
					.setTitle(`Sorts de ${userData.name || tag} — Clash of Clans`)
					.setDescription(embedDescription.length > 2048 ? `${embedDescription.slice(0, 2045)}...` : embedDescription)
					.setFooter({ text: `Données fournies par Clash of Clans${embedDescription.length > 2048 ? " • trop long pour être affiché entièrement" : ""}` })
					.setColor(bacheroFunctions.colors.primary)

				interaction.reply({ embeds: [embed], ephemeral: true })
			}
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir la sous-commande
		var subcommand = interaction.options.getSubcommand()
		bacheroFunctions.showDebug(`Commande gamestats appelée, sous-commande : ${subcommand}`)

		// MonkeyType
		if(subcommand == "monkeytype"){
			// Définir des variables
			var _username = interaction.options.getString("username")
			var userData

			// Eviter que le nom d'utilisateur ne contienne de caractères spéciaux
			var username = _username.replaceAll("/", "").replaceAll("\\", "").replaceAll(":", "").replaceAll("#", "").replaceAll("?", "").replaceAll("&", "")
			bacheroFunctions.showDebug(`MonkeyType - Nom d'utilisateur : "${_username}" --> "${username}"`)

			// Obtenir les données sur l'utilisateur
			if(cache.has(`mt-${username}`)) userData = cache.get(`mt-${username}`)
			else {
				bacheroFunctions.showDebug("MonkeyType - Fetch profile")
				userData = await monkeytype.fetchProfile(username)
				if(userData?.message && userData?.message == "User not found") return await interaction.editReply({ content: "L'utilisateur n'a pas pu être trouvé, vérifier le nom d'utilisateur et réessayer." })
				if(userData?.message && userData?.message != "Profile retrieved") return await bacheroFunctions.report.createAndReply("requête vers l'API de MonkeyType", userData.message, { username, userData }, interaction)
				if(!userData?.data) return await bacheroFunctions.report.createAndReply("requête vers l'API de MonkeyType", userData, { username }, interaction)
				cache.set(`mt-${username}`, userData, 1800) // 30 minutes
			}

			// Déterminer si l'utilisateur a des badges
			bacheroFunctions.showDebug("MonkeyType - Parse badges")
			var badges = userData.data.inventory?.badges
			if(badges?.length) badges = badges.map(badge => `« ${monkeytype.badge[badge?.id]} »`).join(", ")
			else badges = []

			// Créer l'embed avec les détails du profil
			bacheroFunctions.showDebug("MonkeyType - Création embed profile")
			var embedProfile = new EmbedBuilder()
				.setTitle(`${userData.data?.name || username} — MonkeyType`)
				.setDescription(`
				${userData.data?.details?.bio ? `> ${escapeMarkdown(userData.data.details.bio).replaceAll("\n", "  ")}` : ""}${userData.data?.details?.keyboard ? `\n> Clavier : ${escapeMarkdown(userData.data.details.keyboard).replaceAll("\n", "  ")}` : ""}${userData.data?.details?.socialProfiles && Object.values(userData.data.details?.socialProfiles)?.find(profileValue => profileValue != "") ? `\n> Réseaux : ${Object.keys(userData.data.details?.socialProfiles).filter(profile => userData.data.details?.socialProfiles[profile]?.length).map(profile => `[${profile == "twitter" ? "Twitter" : profile == "website" ? "Site" : profile == "github" ? "GitHub" : profile}](${(profile == "twitter" ? "https://twitter.com/" : profile == "github" ? "https://github.com/" : "") + escapeMarkdown(userData.data.details?.socialProfiles[profile])})`).join(" ; ")}` : ""}

				A rejoint le <t:${Math.round(userData.data.addedAt / 1000)}:f> (<t:${Math.round(userData.data.addedAt / 1000)}:R>)
				Temps passé : ${userData.data.typingStats?.timeTyping > 3600 ? `${Math.round(userData.data.typingStats?.timeTyping / 3600)}h ` : ""}${Math.round(userData.data.typingStats?.timeTyping % 3600 / 60)}m ${Math.round(userData.data.typingStats?.timeTyping % 60)}s
				Streak : ${userData.data.streak} jour${userData.data.streak > 1 ? "s" : ""} (record : ${userData.data.maxStreak} jour${userData.data.maxStreak > 1 ? "s" : ""})
				${badges?.length ? `Badge${badges?.length > 1 ? "s" : ""} : ${badges}\n` : ""}
				Tests : ${userData.data.typingStats?.startedTests}
				Complétés : ${userData.data.typingStats?.completedTests} (≈ ${Math.round(userData.data.typingStats?.completedTests / userData.data.typingStats?.startedTests * 100)}%)
				`)
				.setFooter({ text: "Données fournies par MonkeyType" })
				.setColor(bacheroFunctions.colors.primary)

			// Créer l'embed avec les records
			bacheroFunctions.showDebug("MonkeyType - Création embed records")
			var globalLeaderboard15 = userData.data.allTimeLbs?.time?.["15"]?.english
			var globalLeaderboard60 = userData.data.allTimeLbs?.time?.["60"]?.english
			var embedRecords = new EmbedBuilder()
				.setTitle(`${userData.data?.name || username} — MonkeyType`)
				.setDescription(`
				${Object.entries(userData.data.personalBests?.time).map(([key, value]) => `**${key} secs :**${value?.[0]?.wpm ? `\n> Vitesse : ${Math.round(value?.[0]?.wpm)} WPM (${Math.round(value?.[0]?.wpm * 5)} CPM)` : ""}${value?.[0]?.acc ? `\n> Précision : ${value?.[0]?.acc} %` : ""}${value?.[0]?.consistency ? `\n> Consistance : ${value?.[0]?.consistency} %` : ""}${value?.[0]?.language ? `\n> Langage : ${value?.[0]?.language} (${value?.[0]?.difficulty})` : ""}\n> Options : ${value?.[0]?.punctuation ? "Avec ponctuation" : "Sans ponctuation"} ; ${value?.[0]?.lazyMode ? "Lazy mode activée" : "Lazy mode désactivée"}${value?.[0]?.timestamp ? `\n> <t:${Math.round(value?.[0]?.timestamp / 1000)}:f> (<t:${Math.round(value?.[0]?.timestamp / 1000)}:R>)` : ""}`).join("\n\n")}

				${Object.entries(userData.data.personalBests?.words).map(([key, value]) => `**${key} mots :**${value?.[0]?.wpm ? `\n> Vitesse : ${Math.round(value?.[0]?.wpm)} WPM (${Math.round(value?.[0]?.wpm * 5)} CPM)` : ""}${value?.[0]?.acc ? `\n> Précision : ${value?.[0]?.acc} %` : ""}${value?.[0]?.consistency ? `\n> Consistance : ${value?.[0]?.consistency} %` : ""}${value?.[0]?.language ? `\n> Langage : ${value?.[0]?.language} (${value?.[0]?.difficulty})` : ""}\n> Options : ${value?.[0]?.punctuation ? "Avec ponctuation" : "Sans ponctuation"} ; ${value?.[0]?.lazyMode ? "Lazy mode activée" : "Lazy mode désactivée"}${value?.[0]?.timestamp ? `\n> <t:${Math.round(value?.[0]?.timestamp / 1000)}:f> (<t:${Math.round(value?.[0]?.timestamp / 1000)}:R>)` : ""}`).join("\n\n")}

				${globalLeaderboard15?.rank || globalLeaderboard60?.rank ? `**Classement générale :** (anglais, all-time)${globalLeaderboard15?.rank ? `\n> 15 secondes : ${globalLeaderboard15?.rank}${globalLeaderboard15 == 1 ? "er 👑" : "ème"}` : ""}${globalLeaderboard60?.rank ? `\n> 60 secondes : ${globalLeaderboard60?.rank}${globalLeaderboard60 == 1 ? "er 👑" : "ème"}` : ""}` : ""}
				`)
				.setFooter({ text: "Données fournies par MonkeyType" })
				.setColor(bacheroFunctions.colors.primary)

			// Ajouter un bouton permettant d'accéder au profil
			var button = new ButtonBuilder()
				.setLabel("Voir le profil")
				.setStyle(ButtonStyle.Link)
				.setURL(`https://monkeytype.com/profile/${username}`)

			// Répondre
			bacheroFunctions.showDebug("MonkeyType - Répondre avec les infos")
			await interaction.editReply({ embeds: [embedProfile, embedRecords], components: [new ActionRowBuilder().addComponents(button)] })
		}

		// Clash Royale
		else if(subcommand == "clashroyale"){
			// Définir des variables
			var _tag = interaction.options.getString("tag")
			var userData

			// Eviter que le tag ne contienne de caractères spéciaux
			bacheroFunctions.showDebug(`Clash Royale - Tag : "${_tag}" --> "${tag}"`)
			var tag = _tag.replaceAll("/", "").replaceAll("\\", "").replaceAll(":", "").replaceAll("#", "").replaceAll("?", "").replaceAll("&", "")

			// Obtenir les données sur l'utilisateur
			if(cache.has(`cr-${tag}`)) userData = cache.get(`cr-${tag}`)
			else {
				bacheroFunctions.showDebug("Clash Royale - Fetch profile")
				userData = await clashroyale.fetchProfile(tag)
				if(userData?.message && userData?.message == "notFound") return await interaction.editReply({ content: "L'utilisateur n'a pas pu être trouvé, vérifier que vous avez bien copié les caractères (par exemple, vérifier que les O ne soient pas des 0) et réessayer." })
				if(!userData?.name) return await bacheroFunctions.report.createAndReply("requête vers l'API de Clash Royale", userData, { tag }, interaction)
				cache.set(`cr-${tag}`, userData, 1800) // 30 minutes
			}

			// Créer l'embed avec les détails du profil
			bacheroFunctions.showDebug("Clash Royale - Création embed profile")
			var embedProfile = new EmbedBuilder()
				.setTitle(`${userData.name || tag} — Clash Royale`)
				.setDescription(`
				Niveau : ${userData?.expLevel}
				Trophées : ${userData?.trophies} (+ haut : ${userData?.bestTrophies})

				Arène : ${userData?.arena?.name ? escapeMarkdown(userData.arena.name.replace("Arena ", "")) : "Inconnue"}
				Clan : ${escapeMarkdown(userData?.clan?.name || "Aucun")}${userData?.clan?.tag ? ` (${userData?.clan?.tag})` : ""}
				Carte favorite : ${escapeMarkdown(userData?.currentFavouriteCard?.name || "Inconnue")}${userData?.currentFavouriteCard?.rarity ? ` (${clashroyale.cardsRarity[userData?.currentFavouriteCard?.rarity]})` : ""}

				${userData?.threeCrownWins} victoire${userData?.threeCrownWins > 1 ? "s" : ""} par 3 couronnes
				${userData?.wins} victoire${userData?.wins > 1 ? "s" : ""} (${Math.round(userData?.wins / (userData?.wins + userData?.losses) * 100)}% de wins)
				${userData?.losses} défaite${userData?.losses > 1 ? "s" : ""} (${userData?.battleCount} combat${userData?.battleCount > 1 ? "s" : ""} total)
				`)
				.setFooter({ text: "Données fournies par Clash Royale" })
				.setColor(bacheroFunctions.colors.primary)

			// Créer l'embed avec les différentes cartes
			bacheroFunctions.showDebug("Clash Royale - Création embed cards")
			var embedCards = new EmbedBuilder()
				.setTitle(`${userData.name || tag} — Clash Royale`)
				.addFields(userData?.currentDeck?.map(card => { return { name: card.name, value: `> Niveau : ${card.level} (max : ${card.maxLevel})\n> Rareté : ${clashroyale.cardsRarity[card.rarity]}\n> Coût d'élixir : ${card.elixirCost}\n> Quantité : ${card.count}`, inline: true } }) || [])
				.setFooter({ text: "Données fournies par Clash Royale" })
				.setColor(bacheroFunctions.colors.primary)

			// Ajouter un niveau champ avec les statistiques globale
			bacheroFunctions.showDebug("Clash Royale - Ajout des statistiques globales à l'embed des cartes")
			var communCards = userData?.cards?.filter(card => card.rarity == "common")?.length
			var rareCards = userData?.cards?.filter(card => card.rarity == "rare")?.length
			var epicCards = userData?.cards?.filter(card => card.rarity == "epic")?.length
			var legendaryCards = userData?.cards?.filter(card => card.rarity == "legendary")?.length
			embedCards.addFields([{ name: "Statistiques globales", value: `${communCards} commune${communCards > 1 ? "s" : ""}\n${rareCards} rare${rareCards > 1 ? "s" : ""}\n${epicCards} épique${epicCards > 1 ? "s" : ""}\n${legendaryCards} légendaire${legendaryCards > 1 ? "s" : ""}\n= ${userData?.cards?.length} cartes`, inline: true }])

			// Ajouter un bouton permettant d'afficher toutes les cartes
			var button = new ButtonBuilder()
				.setLabel("Afficher toutes les cartes")
				.setStyle(ButtonStyle.Primary)
				.setCustomId(`clashroyale-showCards-${tag.replace("#", "")}`)

			// Répondre
			await interaction.editReply({ embeds: [embedProfile, embedCards], components: [new ActionRowBuilder().addComponents(button)] })
		}

		// Brawl Stars
		else if(subcommand == "brawlstars"){
			// Définir des variables
			var _tag = interaction.options.getString("tag")
			var userData

			// Eviter que le tag ne contienne de caractères spéciaux
			var tag = _tag.replaceAll("/", "").replaceAll("\\", "").replaceAll(":", "").replaceAll("#", "").replaceAll("?", "").replaceAll("&", "")
			bacheroFunctions.showDebug(`Brawl Stars - Tag : "${_tag}" --> "${tag}"`)

			// Obtenir les données sur l'utilisateur
			if(cache.has(`bs-${tag}`)) userData = cache.get(`bs-${tag}`)
			else {
				bacheroFunctions.showDebug("Brawl Stars - Fetch profile")
				userData = await brawlstars.fetchProfile(tag)
				if(userData?.message && userData?.message == "notFound") return await interaction.editReply({ content: "L'utilisateur n'a pas pu être trouvé, vérifier que vous avez bien copié les caractères (par exemple, vérifier que les O ne soient pas des 0) et réessayer." })
				if(!userData?.name) return await bacheroFunctions.report.createAndReply("requête vers l'API de Brawl Stars", userData, { tag }, interaction)
				cache.set(`bs-${tag}`, userData, 1800) // 30 minutes
			}

			// Créer l'embed avec les détails du profil
			bacheroFunctions.showDebug("Brawl Stars - Création embed profile")
			var embed = new EmbedBuilder()
				.setTitle(`${userData.name || tag} — Brawl Stars`)
				.setDescription(`
				Niveau : ${addSpaceNumbers(userData?.expLevel)}
				Points d'XPs : ${addSpaceNumbers(userData?.expPoints)}

				Trophées : ${addSpaceNumbers(userData?.trophies)} (+ haut : ${addSpaceNumbers(userData?.highestTrophies)})
				Club : ${escapeMarkdown(userData?.club?.name || "Aucun")}${userData?.club?.tag ? ` (${userData?.club?.tag})` : ""}

				${addSpaceNumbers(userData?.["3vs3Victories"])} victoire${userData?.["3vs3Victories"] > 1 ? "s" : ""} en 3v3
				${addSpaceNumbers(userData?.soloVictories)} victoire${userData?.soloVictories > 1 ? "s" : ""} en solo
				${addSpaceNumbers(userData?.duoVictories)} victoire${userData?.duoVictories > 1 ? "s" : ""} en duo
				`)
				.setFooter({ text: "Données fournies par Brawl Stars" })
				.setColor(bacheroFunctions.colors.primary)

			// Ajouter un bouton permettant d'afficher tous les brawlers
			var button = new ButtonBuilder()
				.setLabel("Afficher tous les brawlers")
				.setStyle(ButtonStyle.Primary)
				.setCustomId(`brawlstars-showBrawlers-${tag.replace("#", "")}`)

			// Répondre
			await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] })
		}

		// Clash of Clans
		else if(subcommand == "clashofclans"){
			// Définir des variables
			var _tag = interaction.options.getString("tag")
			var userData

			// Eviter que le tag ne contienne de caractères spéciaux
			var tag = _tag.replaceAll("/", "").replaceAll("\\", "").replaceAll(":", "").replaceAll("#", "").replaceAll("?", "").replaceAll("&", "")
			bacheroFunctions.showDebug(`Clash of Clans - Tag : "${_tag}" --> "${tag}"`)

			// Obtenir les données sur l'utilisateur
			if(cache.has(`coc-${tag}`)) userData = cache.get(`coc-${tag}`)
			else {
				bacheroFunctions.showDebug("Clash of Clans - Fetch profile")
				userData = await clashofclans.fetchProfile(tag)
				if(userData?.message && userData?.message == "notFound") return await interaction.editReply({ content: "L'utilisateur n'a pas pu être trouvé, vérifier que vous avez bien copié les caractères (par exemple, vérifier que les O ne soient pas des 0) et réessayer." })
				if(!userData?.name) return await bacheroFunctions.report.createAndReply("requête vers l'API de Clash of Clans", userData, { tag }, interaction)
				cache.set(`coc-${tag}`, userData, 1800) // 30 minutes
			}

			// Créer l'embed avec les détails du profil
			bacheroFunctions.showDebug("Clash of Clans - Création embed profile")
			var embed = new EmbedBuilder()
				.setTitle(`${userData.name || tag} — Clash of Clans`)
				.setDescription(`
				Niveau : ${addSpaceNumbers(userData?.expLevel)}
				Clan : ${escapeMarkdown(userData?.clan?.name || "Aucun")}${userData?.clan?.tag ? ` (${userData?.clan?.tag})` : ""}${userData?.role ? `\nRôle dans le clan : ${clashofclans.rolesClan[userData.role]}` : ""}

				Hôtel de ville : niveau ${userData?.townHallLevel}
				Maison des ouvriers : niveau ${userData?.builderHallLevel}

				Trophées, village principal : ${addSpaceNumbers(userData?.trophies)} (+ haut : ${addSpaceNumbers(userData?.bestTrophies)})
				Trophées, base des ouvriers : ${addSpaceNumbers(userData?.builderBaseTrophies)} (+ haut : ${addSpaceNumbers(userData?.bestBuilderBaseTrophies)})

				League, village principal : ${userData?.league?.name || "Non classé"}
				League, base des ouvriers : ${userData?.builderBaseLeague?.name || "Non classé"}
				`)
				.setFooter({ text: "Données fournies par Clash of Clans" })
				.setColor(bacheroFunctions.colors.primary)

			// Ajouter des boutons
			var row = new ActionRowBuilder()
			row.addComponents([
				new ButtonBuilder()
					.setLabel("Afficher les troupes")
					.setStyle(ButtonStyle.Primary)
					.setCustomId(`clashofclans-troops-${tag.replace("#", "")}`),
				new ButtonBuilder()
					.setLabel("Afficher les héros")
					.setStyle(ButtonStyle.Primary)
					.setCustomId(`clashofclans-heroes-${tag.replace("#", "")}`),
				new ButtonBuilder()
					.setLabel("Afficher les sorts")
					.setStyle(ButtonStyle.Primary)
					.setCustomId(`clashofclans-spells-${tag.replace("#", "")}`)
			])

			// Répondre
			await interaction.editReply({ embeds: [embed], components: [row] })
		}

		// Paladium
		else if(subcommand == "paladium"){
			// Définir des variables
			var _username = interaction.options.getString("username")
			var profile
			var trixium

			// Eviter que le nom d'utilisateur ne contienne de caractères spéciaux
			var username = _username.replaceAll("/", "").replaceAll("\\", "").replaceAll(":", "").replaceAll("#", "").replaceAll("?", "").replaceAll("&", "")
			bacheroFunctions.showDebug(`Paladium - Nom d'utilisateur : "${_username}" --> "${username}"`)

			// Obtenir les données sur l'utilisateur
			if(cache.has(`pd-${username}`)) userData = cache.get(`pd-${username}`)
			else {
				bacheroFunctions.showDebug("Paladium - Fetch profile")
				var userData = await paladium.allInOne(username)
				if(userData?.message == "You are not allowed to access this resource.") return await interaction.editReply({ content: "Paladium refuse d'afficher le profil de ce joueur." })
				if(userData?.message?.includes("not found.")) return await interaction.editReply({ content: "L'utilisateur n'a pas pu être trouvé, vérifier le nom d'utilisateur et réessayer." })
				if(userData?.message || !userData?.profile?.firstJoin) return await bacheroFunctions.report.createAndReply("requête vers l'API de Paladium", userData.message || userData, { username }, interaction)
				cache.set(`pd-${username}`, userData, 1800) // 30 minutes
				profile = userData?.profile
				trixium = userData?.trixium
			}

			// Créer l'embed avec les détails du profil
			bacheroFunctions.showDebug("Paladium - Création embed profile")
			var embed = new EmbedBuilder()
				.setTitle(`${profile?.username || username} — Paladium`)
				.setDescription(`
				A rejoint le <t:${Math.round(profile?.firstJoin / 1000)}:f> (<t:${Math.round(profile?.firstJoin / 1000)}:R>)
				Temps passé : ${prettyMilliseconds(profile?.timePlayed * 60 * 1000)}

				Faction : ${profile?.faction || "Wilderness"}
				Argent : ${addSpaceNumbers(Math.round(profile?.money))} $
				Position Trixium : ${trixium?.position || "Non classé"} (${addSpaceNumbers(trixium?.value || 0)} trixium${trixium?.value > 1 ? "s" : ""})
				${profile?.friends?.length ? `Ami${profile?.friends?.length > 1 ? "s" : ""} : ${profile?.friends?.map(friend => escapeMarkdown(friend?.name)).join(", ")}\n` : ""}
				Mineur : niveau ${profile?.jobs?.miner?.level || 0}
				Farmer : niveau ${profile?.jobs?.farmer?.level || 0}
				Hunter : niveau ${profile?.jobs?.hunter?.level || 0}
				Alchimiste : niveau ${profile?.jobs?.alchemist?.level || 0}
				`)
				.setFooter({ text: "Données fournies par Paladium" })
				.setColor(bacheroFunctions.colors.primary)

			// Ajouter un bouton permettant d'accéder au profil sur Namemc
			var button = new ButtonBuilder()
				.setLabel("Voir sur NameMC")
				.setStyle(ButtonStyle.Link)
				.setURL(`https://fr.namemc.com/profile/${profile?.username || username}`)

			// Répondre
			bacheroFunctions.showDebug("Paladium - Répondre avec les infos")
			await interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] })
		}

	}
}