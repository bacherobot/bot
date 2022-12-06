const chalk = require('chalk')
const { codeBlock } = require('discord.js')
const bacheroFunctions = require('../../functions')
if(bacheroFunctions.config.getValue('bachero', 'disableReport') == true) return // si le système de rapports est désactivé, on arrête le chargement du module
const secretPassword = bacheroFunctions.config.getValue('bachero.module.showReports', 'secretPassword')

module.exports = {
	async getClient(client){
		// Vérifier le mot de passe définit dans le fichier de configuration
		if(secretPassword == 'password') console.log(chalk.yellow("[WARN] ") + `Le mot de passe entré pour le module "bachero.module.showReports" n'a pas été changé. Pour plus de sécurité, veuillez le changer dans le fichier de configuration associé au module.`)

		// Quand on reçoit un message
		client.on('messageCreate', async (message) => {
			if(message.content.startsWith('bachero-send-reports')){
				// Si on est pas en message privé
				if(message.channel.type != 1) return message.reply('Vous devez utiliser cette commande en message privé pour plus de sécurité.')

				// Si il n'y a pas de mot de passe
				var password = message.content.split(' ')[1]
				if(!password) return message.reply('Vous devez entrer un mot de passe pour utiliser cette commande. Exemple : `bachero-send-reports <votre mot de passe>.`')

				// Si le mot de passe est incorrect
				if(password != secretPassword) return message.reply("Le mot de passe entré n'est pas celui entré dans le fichier de configuration.")

				// Demander l'identifiant du rapport
				var filter = m => m.author.id == message.author.id
				var reportId = message.channel.createMessageCollector({ filter, time: 30000 })
				var tempAskMessage = await message.reply("Veuillez entrer l'identifiant du rapport que vous souhaitez voir. Vous pouvez également envoyer `cancel` pour annuler la commande, ou patienter 30 secondes.")
				reportId.on('collect', async m => {
					// Si on annule
					if(m.content == 'cancel'){
						reportId.stop('cancel')
						return tempAskMessage.delete().catch(err => {})
					}

					// Sinon, obtenir un rapport avec cet identifiant
					reportId.stop('correct')
					var report = await bacheroFunctions.report.get(m.content)

					// Si le rapport fait moins de 2000 caractères, l'envoyer directement, sinon faire un fichier
					if(report.length < 2000) message.channel.send(codeBlock(report)).catch(err => {})
					else message.channel.send({ files: [{ attachment: Buffer.from(report), name: 'report.txt' }] }).catch(err => {})

					// Supprimer le message temporaire
					tempAskMessage.delete().catch(err => {})
				})
			}
		})
	}
}