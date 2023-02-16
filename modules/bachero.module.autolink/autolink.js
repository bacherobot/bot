const { EmbedBuilder } = require('discord.js')
const fetch = require('node-fetch')
const chalk = require('chalk')
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('bachero.module.autolink')

// Fonction pour obtenir des informations sur un lien
var cachedData = {}
async function getLinkData(link){
	// Prendre uniquement les informations essentielles du lien
	var parsedURL = new URL(link)
	var cleanURL = parsedURL.origin + parsedURL.pathname

	// Si on a déjà des informations sur ce lien, on les renvoie
	if(cachedData[cleanURL]){
		cachedData[cleanURL].lastUsed = Date.now()
		return cachedData[cleanURL].data
	}

	// Sinon, on fait une requête
	if(parsedURL.host.startsWith('github.com')){
		// Obtenir l'URL de l'API à fetch
		var pathnameSplit = parsedURL.pathname.split('/')
		if(pathnameSplit.length < 2) return
		if(pathnameSplit?.[2]) var apiURL = `https://api.github.com/repos/${pathnameSplit?.[1]}/${pathnameSplit?.[2]}${pathnameSplit?.[3] && pathnameSplit?.[4] ? `/${pathnameSplit?.[3] == 'pull' ? 'pulls' : pathnameSplit?.[3]}/${pathnameSplit?.[4]}` : ''}`
		else var apiURL = `https://api.github.com/users/${pathnameSplit?.[1]}`

		// Faire la requête et enregistrer dans le cache
		var apiData = await fetch(apiURL, process.env.AUTOLINK_GITHUB_TOKEN ? { headers: { 'Authorization': process.env.AUTOLINK_GITHUB_TOKEN } } : {}).then(res => res.json()).catch(err => { return {} })
		if(apiData?.message && apiData?.message != 'Not Found') return console.warn(chalk.yellow("[WARN] ") + "Problème rencontré lors d'une vérification avec le module \"bachero.module.autolink\" : " + apiData?.message || JSON.stringify(apiData))
		if((pathnameSplit?.[3] == 'pull' || pathnameSplit?.[3] == 'pulls') && apiData?.title) cachedData[cleanURL] = { lastUsed: Date.now(), data: { platform: 'github', type: 'pulls', commits: apiData?.commits, state: apiData?.state, created_at: apiData?.created_at, closed_at: apiData?.closed_at, title: apiData?.title?.trim(), author: apiData?.user?.login, html_url: apiData?.html_url } }
		else if((pathnameSplit?.[3] == 'issue' || pathnameSplit?.[3] == 'issues') && apiData?.title) cachedData[cleanURL] = { lastUsed: Date.now(), data: { platform: 'github', type: 'issues', state: `${apiData?.state}${apiData?.state_reason ? ' ('+apiData?.state_reason+')' : ''}`, created_at: apiData?.created_at, closed_at: apiData?.closed_at, title: apiData?.title?.trim(), author: apiData?.user?.login, html_url: apiData?.html_url } }
		else if(apiData?.name) cachedData[cleanURL] = { lastUsed: Date.now(), data: { platform: 'github', type: 'repo', name: apiData?.name, description: apiData?.description?.trim(), author: apiData?.owner?.login, html_url: apiData?.html_url } }
		else if(apiData?.login) cachedData[cleanURL] = { lastUsed: Date.now(), data: { platform: 'github', type: 'user', login: apiData?.login, email: apiData?.email, name: apiData?.name, bio: apiData?.bio, html_url: apiData?.html_url } }
	}
	if(parsedURL.host.startsWith('gist.github.com')){
		// Obtenir l'URL de l'API à fetch
		var pathnameSplit = parsedURL.pathname.split('/')
		if(pathnameSplit[pathnameSplit.length-1] == '') pathnameSplit.length = pathnameSplit.length - 1

		// Faire la requête et enregistrer dans le cache
		var apiData = await fetch(`https://api.github.com/gists/${pathnameSplit[pathnameSplit.length-1]}`).then(res => res.json()).catch(err => { return {} })
		if(apiData?.message && apiData != 'Not Found') return console.warn(chalk.yellow("[WARN] ") + "Problème rencontré lors d'une vérification avec le module \"bachero.module.autolink\" : " + apiData?.message || JSON.stringify(apiData))
		if(apiData?.description) cachedData[cleanURL] = { lastUsed: Date.now(), data: { platform: 'github', type: 'gist', description: apiData?.description, comments: apiData?.comments, author: apiData?.owner?.login, html_url: apiData?.html_url  } }
	}
	if(parsedURL.host.startsWith('www.npmjs.com')){
		// Obtenir l'URL de l'API à fetch
		var pathnameSplit = parsedURL.pathname.split('/')
		if(pathnameSplit[pathnameSplit.length-1] == '') pathnameSplit.length = pathnameSplit.length - 1
		if(parsedURL.pathname.includes('@')){
			 // Fusionner les deux derniers éléments de l'array si le nom du module contient un @
			pathnameSplit[pathnameSplit.length-2] = pathnameSplit[pathnameSplit.length-2] + '/' + pathnameSplit[pathnameSplit.length-1]
			pathnameSplit.length = pathnameSplit.length - 1
		}

		// Faire la requête et enregistrer dans le cache
		var apiData = await fetch(`https://registry.npmjs.org/${pathnameSplit[pathnameSplit.length-1]}`).then(res => res.json()).catch(err => { return {} })
		if(apiData?.error) return console.warn(chalk.yellow("[WARN] ") + "Problème rencontré lors d'une vérification avec le module \"bachero.module.autolink\" : " + apiData?.error || JSON.stringify(apiData))
		if(apiData?.name && apiData?.description) cachedData[cleanURL] = { lastUsed: Date.now(), data: { platform: 'npm', name: apiData?.name, description: apiData?.description, author: apiData?.author, html_url: `https://www.npmjs.com/package/${apiData?.name}` } }
	}

	// Si on a des nouvelles données, on les renvoie
	if(cachedData[cleanURL]) return cachedData[cleanURL].data
}

// Exporter une fonction
module.exports = {
	getClient(client){
		client.on('messageCreate', async message => {
			// Vérifier qu'on soit dans un salon d'un serveur
			if(!message.guild) return

			// Si la fonctionnalité est désactivée, on ne fait rien
			if(await bacheroFunctions.database.get(database, `enabled-${message.guild.id}`) != true) return

			// Rechercher les liens dans le message
			var links = message.content.match(/https?:\/\/[^\s]+/g)

			// Filtrer pour n'ajouter que les liens de certains domaines
			if(links?.length) links = links.filter(link => {
				link = link.replace('https://','')
				if(link.startsWith('github.com')) return true
				if(link.startsWith('gist.github.com')) return true
				if(link.startsWith('www.npmjs.com/package')) return true
				return false
			})

			// Supprimer les liens en double
			if(links?.length) links = [...new Set(links)]

			// Générer la description de l'embed
			var description = [];
			if(links?.length) for(var link of links){
				// Récupérer les informations du lien
				var info = await getLinkData(link)

				// GitHub
				if(info?.platform == 'github' && info?.type == 'user') description.push(`(GitHub) [${info?.login}](${info?.html_url})${info?.name ? ' ('+info?.name+')' : ''}${info?.email ? '\n> '+info?.email : ''}${info?.bio ? '\n> '+info?.bio?.substring(0, 1400) : ''}`.trim())
				if(info?.platform == 'github' && info?.type == 'repo') description.push(`(GitHub) [${info?.name}](${info?.html_url})\n> *[${info?.author}](https://github.com/${info?.author?.replace('[bot]','')})*${info?.description ? ' | ' + info?.description?.substring(0, 1400) : ''}`.trim())
				if(info?.platform == 'github' && info?.type == 'pulls') description.push(`(GitHub) [${info?.title}](${info?.html_url})\n> Auteur : [${info?.author}](https://github.com/${info?.author?.replace('[bot]','')})\n> ${info?.commits} commit${info?.commits > 1 ? 's' : ''}, pull request ${info?.state?.replace('closed','fermée').replace('opened', 'ouverte').replace('merged', 'fusionnée/merged')}\n> <t:${Math.round(new Date(info?.created_at).getTime() / 1000)}:D> → <t:${Math.round(new Date(info?.closed_at).getTime() / 1000)}:D>`.trim())
				if(info?.platform == 'github' && info?.type == 'issues') description.push(`(GitHub) [${info?.title}](${info?.html_url})\n> Auteur : [${info?.author}](https://github.com/${info?.author?.replace('[bot]','')})\n> Issue ${info?.state?.replace('closed','fermée').replace('open', 'ouverte').replace('completed', 'completée').replace('not_planned', 'non prévue').replace('reopened','réouverte')}\n> <t:${Math.round(new Date(info?.created_at).getTime() / 1000)}:D> → <t:${Math.round(new Date(info?.closed_at).getTime() / 1000)}:D>`.trim())
				if(info?.platform == 'github' && info?.type == 'gist') description.push(`(GitHub Gist) [${info?.description.substring(0, 250)}](${info?.html_url})\n> Auteur : [${info?.author}](https://github.com/${info?.author?.replace('[bot]','')})${info?.comments ? `\n> ${info?.comments} commentaires` : ''}`.trim())

				// Autres
				if(info?.platform == 'npm') description.push(`(NPM) [${info?.name}](${info?.html_url})${info?.author && typeof info?.author == 'string' && info?.author?.length ? `\n> Auteur : [${info?.author}](https://www.npmjs.com/~${info?.author?.toLowerCase()})` : ''}${info?.description ? '\n> ' + info?.description.substring(0, 1400) : ''}`.trim())
			}

			// On annule si aucun lien n'a été trouvé
			if(!links?.length || !description?.length) return

			// Générer un embed
			var embed = new EmbedBuilder()
			.setTitle(`${links.length > 1 ? 'Des liens ont été détectés' : 'Un lien a été détecté'}`)
			.setDescription(description.join('\n\n').substring(0, 4000))
			.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
			.setFooter({ text: `${description.join('\n\n').length > 2000 ? "Les informations sont tronquées." : "Le contenu de ce message n'est pas vérifié"}. Informations obtenues grâce au message de ${message.author.tag} (ID: ${message.author.id}).` })
			message.reply({ embeds: [embed] }).catch(err => {})
		})
	}
}