const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const escape = require("markdown-escape")
const authorizedIds = bacheroFunctions.config.getValue("bachero.module.moduleInfo", "authorizedIds")
const compactList = bacheroFunctions.config.getValue("bachero.module.moduleInfo", "compactList")
const addDetails = bacheroFunctions.config.getValue("bachero.module.moduleInfo", "addDetails")
var allModulesDetails

var listModules = []
var pages = ["<ne doit pas être accéder, signaler ce problème.>"] // Faire que le premier élément (0) soit vide, pour que la liste commence à 1

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("module")
		.setDescription("Affiche la liste des modules")
		.addStringOption(option => option.setName("packagename")
			.setDescription("Affiche des informations sur un module en particulier")
			.setRequired(false))
		.addNumberOption(option => option.setName("page")
			.setDescription("Permet de choisir la page affichée lorsqu'on n'entre pas de nom de module")
			.setRequired(false)),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Vérifier que la personne est autorisé
		if(authorizedIds?.length && !authorizedIds?.includes(interaction.user.id)) return interaction.reply({ ephemeral: true, content: "Oupsi, tu n'as pas le droit d'utiliser cette commande..." }).catch(err => {})

		// Si on a pas encore la liste des modules, la définir
		if(!allModulesDetails) allModulesDetails = bacheroFunctions.modules.allModulesDetails()

		// Obtenir le nom de packet
		var packageName = interaction.options.getString("packagename")

		// Obtenir la liste des modules si elle n'a pas encore été défini
		if(!listModules?.length) listModules = Object.values(Object.fromEntries(allModulesDetails))

		// Diviser la liste en plusieurs pages
		var modulesMessage = ""
		if(!pages?.[1]) listModules.forEach(mod => {
			if(modulesMessage.length > 3900){
				pages.push(modulesMessage)
				modulesMessage = compactList ? `\n• *${escape(mod.packageName)}* : ${escape(mod.shortDescription)}` : `\n\n**${escape(mod.packageName)}** :\n> ${escape(mod.shortDescription)}`
			} else modulesMessage += compactList ? `\n• *${escape(mod.packageName)}* : ${escape(mod.shortDescription)}` : `\n\n**${escape(mod.packageName)}** :\n> ${escape(mod.shortDescription)}`
		})
		if(modulesMessage) pages.push(modulesMessage)

		// Si aucun nom de packet n'est donné, obtenir la liste des modules
		if(!packageName){
			// Créér un embed pour afficher la liste des modules
			var embed = new EmbedBuilder()
				.setTitle("Liste des modules")
				.setColor(bacheroFunctions.colors.primary)

			// Si on veut choisir une page à afficher
			var currentlyShowedPage = interaction.options.getNumber("page") || 1
			if(currentlyShowedPage > pages?.length - 1) embed.setFooter({ text: "Première page affichée car la valeur que vous avez spécifiée est trop haute" })
			else if(currentlyShowedPage < 1) embed.setFooter({ text: "Première page affichée car la valeur que vous avez spécifiée est trop basse" })
			else embed.setFooter({ text: `Affichage de la page ${currentlyShowedPage}/${pages?.length - 1} • ${listModules?.length} résultats` })

			// Ajouter la page dans l'embed
			embed.setDescription(pages[currentlyShowedPage] || pages[1] || pages[0] || pages?.join("\n") || pages) // le choix de la sécurité

			// Répondre avec l'embed
			interaction.reply({ embeds: [embed] }).catch(err => {})
		}
		// Sinon, obtenir les infos sur le module
		else {
			// Obtenir le module
			var module = listModules.find(m => m.packageName == packageName)
			if(!module) var module = listModules.find(m => m.packageName.toLowerCase().replace(/[^a-zA-Z]+/g, "") == packageName.toLowerCase().replace(/[^a-zA-Z]+/g, ""))

			// Si le module n'existe pas, répondre avec un message d'erreur
			if(!module){
				var embed = new EmbedBuilder()
					.setTitle("Module introuvable")
					.setDescription(`Aucun module avec le nom \`${packageName.replace(/`/g, "")}\` n'a été trouvé. Utiliser la commande sans arguments pour obtenir la liste complète.`)
					.setColor(bacheroFunctions.colors.secondary)
				return interaction.reply({ embeds: [embed] }).catch(err => {})
			}

			// Sinon, créer un embed pour afficher les infos du module
			var embed = new EmbedBuilder()
				.setTitle(module.name)
				.setDescription(`> ${escape(module.shortDescription)}\n\n**Nom de packet :** ${escape(module.packageName)}\n**Auteur${module.authors.length > 1 ? "s" : ""} :** ${module?.completeAuthors?.length ? module.completeAuthors.map(author => ((author?.discordId || author?.link) && author?.name) ? `[${escape(author.name)}](${author?.link ? escape(author.link) : `https://discord.com/users/${escape(author?.discordId)}`})` : (author?.name || author)).join(" ; ") : module.authors.join(" ; ")}\n**Commande${module.commands.length > 1 ? "s" : ""} :** ${(module?.commands?.length > 0 ? module.commands : [{ name: "Aucune" }]).map(c => `${module?.commands?.length > 1 ? "\nㅤ• " : ""}${escape(c.name)}${addDetails && c.slashToText === false ? "  *(slash uniquement)*" : ""}${addDetails && c.dm_permission === false ? " *(serveur uniquement)*" : ""}`).join(module?.commands?.length > 1 ? "" : " ; ")}${addDetails && module?.contextsMenus?.length ? `\n**Menu${module.contextsMenus.length > 1 ? "s" : ""} contextuel${module.contextsMenus.length > 1 ? "s" : ""} :** ${module.contextsMenus.map(c => `${module?.contextsMenus?.length > 1 ? "\nㅤ• " : ""}${escape(c.name)}`).join(module?.contextsMenus?.length > 1 ? "" : " ; ")}` : ""}`)
				.setColor(bacheroFunctions.colors.primary)
			if(module.source && typeof module.source == "string") embed.setURL(module.source)

			// Répondre avec l'embed
			interaction.reply({ embeds: [embed] }).catch(err => {})
		}
	}
}