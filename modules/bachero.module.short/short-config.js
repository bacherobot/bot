const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js")
const moreshort = require("moreshort")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.short")

// Liste de services
const providersWarning = { // La lib MoreShort ajoute d'autres avertissements
	"s.oriondev.fr": "Est incompatible avec /unshort"
}
const providersList = Object.entries(moreshort.servicesInfos)
	.sort((a, b) => a[1].name.length - b[1].name.length) // on prend les plus courts en premier
	.slice(0, 25) // on évite d'avoir trop de choix (la limite dans un select menu est de 25)
	.map(a => { return { name: a[1].name, website: a[1].website, id: a[1].id, shortcodes: a[1].shortcodes, warning: !a[1].instantRedirect ? "Ne redirige pas directement" : providersWarning[a[1].name] } })

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("short-config")
		.setDescription("Configure le service par défaut à utiliser pour la commande short"),

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le bouton
	async interactionListener(listener){
		listener.on("selectMenu", async (interaction) => {
			// On vérifie l'id
			if(interaction.customId != "shorten-config") return

			// On vérifie que l'auteur est bien l'utilisateur
			if(interaction.user.id != interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})

			// On obtient la valeur
			var provider = interaction.values[0]
			provider = providersList.find(a => a.id == provider)

			// On l'enregistre dans la base de données
			bacheroFunctions.database.set(database, `provider-${interaction.user.id}`, provider.name)

			// On répond à l'interaction
			var embed = new EmbedBuilder()
				.setTitle("Service actuel pour le raccourcissement d'URL")
				.setDescription(`Le service actuel est [\`${provider.name}\`](${provider.website}). Celui-ci ${provider.shortcodes ? "supporte" : "ne supporte pas"} la personnalisation du lien.${provider.warning ? `\n\n> ${provider.warning}.` : ""}`)
				.setColor(bacheroFunctions.colors.primary)
			await interaction.update({ embeds: [embed] }).catch(err => {})
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Obtenir le service actuel
		var provider = await bacheroFunctions.database.get(database, `provider-${interaction.user.id}`)
		var providerComplete = providersList.find(a => a.name == provider)

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle("Service actuel pour le raccourcissement d'URL")
			.setDescription(provider ? `Le service actuel est \`${provider}\`. Celui-ci ${providerComplete?.shortcodes ? "supporte" : "ne supporte pas"} la personnalisation du lien.${providerComplete.warning ? `\n\n> ${providerComplete.warning}.` : ""}` : "Aucun service n'est actuellement défini.")
			.setColor(bacheroFunctions.colors.primary)

		// Créé un select menu pour changer de service
		const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
			.setCustomId("shorten-config")
			.setPlaceholder("Changer de service par défaut")
			.addOptions(providersList.map(t => new StringSelectMenuOptionBuilder().setLabel(t.name).setValue(t.id).setDescription(`${t.shortcodes ? "Supporte" : "Ne supporte pas"}${t.warning ? "" : " la"} modif${t.warning ? "." : "ication du"} lien${t.shortcodes && !t.warning ? " (via modal)" : ""}${t.warning ? ` – ${t.warning}` : ""}`))))

		// Répondre à l'interaction
		interaction.reply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}