var CronJob = require("cron").CronJob
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.level")

// Options de la configuration
const levelUpMessage = bacheroFunctions.config.getValue("bachero.module.level", "levelUpMessage") || "Level up {user} ! Vous êtes désormais au niveau {level}."

// Tout les jours à minuit
new CronJob("1 0 * * *", () => {
	resetTodayXpChatCount()
}).start()

// Supprimer la limite d'XP obtenu par tout les utilisateurs en parlant lors d'une journée
async function resetTodayXpChatCount(){
	// Obtenir la base de données entière
	var databaseContent = await bacheroFunctions.database.getAll(database)

	// On parcours chaque utilisateur
	for(var data of Object.entries(databaseContent)){
		// Mettre à zéro le nombre d'XP journalier
		if(data?.[0].startsWith("user-") && data?.[1] && data?.[1].todayXpChat > 0){
			data[1].todayXpChat = 0 // on met à zéro
			await bacheroFunctions.database.set(database, data[0], data[1])
		}
	}

	// Définir la date
	await bacheroFunctions.database.set(database, "todayDate", new Date().toDateString())
}

module.exports = {
	// On obtient le client
	async getClient(client){
		// On vérifie qu'on a bien supprimé l'XP obtenu en une journée
		if(new Date().toDateString() != (await bacheroFunctions.database.get(database, "todayDate"))) await resetTodayXpChatCount() // On exécute la fonction

		// On détecte chaque nouveau message
		client.on("messageCreate", async message => {
			// On vérifie certains trucs
			if(message.content.length < 3) return // Minimum 3 caractères
			if(message.author.bot) return // Pas les bots
			if(message.channel.type == 1 || message.channel.type == 3) return // Pas en messages privés

			// On récupère l'identifiant
			var userId = message.author.id
			var guildId = message?.guild?.id
			if(!guildId) return

			// On vérifie qu'il a pas envoyé un message il y a qlq instants
			if(await bacheroFunctions.cooldown.check("xpAddChat", userId)) return
			else await bacheroFunctions.cooldown.set("xpAddChat", userId, 2000)

			// Vérifier la quantité d'XP qu'il a obtenu aujourd'hui en parlant
			var userDb = (await bacheroFunctions.database.get(database, `user-${userId}`)) || {}
			if(!userDb?.todayXpChat) userDb.todayXpChat = 0
			if(userDb?.todayXpChat > 450) return // On limite à 450 xp par jours

			// On détermine la quantité d'XP à ajouter : entre 2 et 4, ou entre 1 et 5 si le message fait plus de 70 caractères
			var xpToAdd = !userDb?.todayXpChat
				? 10 // si on a pas obtenu d'XP aujourd'hui, on en ajoute directement dix
				: Math.floor(Math.random() * (((message.content.length < 70 ? 4 : 5) - (message.content.length < 70 ? 2 : 1) + 1) + (message.content.length < 70 ? 2 : 1)))

			// Si on a l'id du serveur, on obtient les infos de ce serveur
			var guildInfo = (await bacheroFunctions.database.get(database, `guild-${guildId}`)) || { levelUpMessage: true } // Si on a pas d'infos, on met la valeur par défaut

			// On ajoute un multiplicateur en fonction du niveau de l'utilisateur
			var multiplicateur = 1
			if(userDb?.level > 5) multiplicateur = 0.9
			if(userDb?.level > 20) multiplicateur = 0.8
			if(userDb?.level > 30) multiplicateur = 0.7
			if(userDb?.level > 50) multiplicateur = 0.6
			if(userDb?.level > 70) multiplicateur = 0.5
			if(userDb?.level > 100) multiplicateur = 0.4
			xpToAdd = Math.floor(xpToAdd * multiplicateur)

			// On ajoute l'XP à l'utilisateur
			if(!userDb.global) userDb.global = { xp: xpToAdd, level: 0 } // interserveur
			else userDb.global.xp += xpToAdd
			if(!userDb?.[`server-${guildId}`]) userDb[`server-${guildId}`] = { xp: xpToAdd, level: 0 } // sur ce serveur
			else userDb[`server-${guildId}`].xp += xpToAdd
			userDb.todayXpChat += xpToAdd // XP obtenu cette journée

			// Ajouter un niveau tous les 1125 XP
			var newLevel_global = parseInt(userDb.global.xp / 1125)
			if(newLevel_global != userDb?.global.level) userDb.global.level = newLevel_global

			// On le refait, pour ce serveur, et en envoyant un message
			var newLevel_server = parseInt(userDb[`server-${guildId}`].xp / 1125)
			if(newLevel_server != userDb[`server-${guildId}`].level){
				// On définit
				userDb[`server-${guildId}`].level = newLevel_server

				// On envoie un message
				if(guildInfo.levelUpMessage) try {
					message.reply(levelUpMessage.replaceAll("{user}", `<@${userId}>`).replaceAll("{level}", newLevel_server)).catch(err => {})
				} catch(e){}
			}

			// On définit dans la base de données
			await bacheroFunctions.database.set(database, `user-${userId}`, userDb)
		})
	}
}