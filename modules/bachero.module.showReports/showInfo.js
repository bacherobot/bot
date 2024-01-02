const { codeBlock } = require("discord.js")
const bacheroFunctions = require("../../functions")
if(bacheroFunctions.config.getValue("bachero", "disableReport") == true) return // si le système de rapports est désactivé, on arrête le chargement du module

module.exports = {
	async getClient(client){
		// Quand on reçoit un message
		client.on("messageCreate", async (message) => {
			if(message.content.startsWith("bachero-send-reports")){
				// Vérifier si l'utilisateur est un administrateur du bot
				if(!bacheroFunctions.ownerIds?.length) return message.reply("Au moins un administrateur doit être défini dans la configuration du bot : [page de la documentation](<https://bachero.johanstick.fr/docs/configuration/dotenv#owner_ids>)")
				if(!bacheroFunctions.ownerIds?.includes(message.author.id)) return message.reply("Vous n'avez pas la permission d'utiliser cette commande.")

				// Demander l'identifiant du rapport
				var filter = m => m.author.id == message.author.id
				var reportId = message.channel.createMessageCollector({ filter, time: 30000 })
				var tempAskMessage = await message.reply("Veuillez entrer l'identifiant du rapport que vous souhaitez voir. Vous pouvez également envoyer `cancel` pour annuler la commande, ou patienter 30 secondes.").catch(err => {})
				reportId.on("collect", async m => {
					// Si on annule
					if(m.content == "cancel"){
						reportId.stop("cancel")
						return tempAskMessage.delete().catch(err => {})
					}

					// Sinon, obtenir un rapport avec cet identifiant
					reportId.stop("correct")
					var report = await bacheroFunctions.report.get(m.content)

					// Si le rapport fait moins de 2000 caractères, l'envoyer directement, sinon faire un fichier
					if(report.length < 2000) message.channel.send(codeBlock(report)).catch(err => {})
					else message.channel.send({ files: [{ attachment: Buffer.from(report), name: "report.txt" }] }).catch(err => {})

					// Supprimer le message temporaire
					tempAskMessage.delete().catch(err => {})
				})
			}
		})
	}
}