const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.short")
const providersList = [
	{
		name: "is.gd",
		id: "is-gd",
		shortcodes: true
	},
	{
		name: "v.gd",
		id: "v-gd",
		shortcodes: true
	},
	{
		name: "s.oriondev.fr",
		id: "s-oriondev-fr",
		shortcodes: true
	},
	{
		name: "s.3vm.cl",
		id: "s-3vm-cl",
		shortcodes: true
	},
	{
		name: "s.ahpc.fi",
		id: "s-ahpc-fi",
		shortcodes: true
	},
	{
		name: "s.acme.si",
		id: "s-acme-si",
		shortcodes: true
	},
	{
		name: "s.3play.cl",
		id: "s-3play-cl",
		shortcodes: true
	},
	{
		name: "s.fronturi.ro",
		id: "s-fronturi-ro",
		shortcodes: true
	},
	{
		name: "shor.vercel.app",
		id: "shor-vercel-app",
		shortcodes: true
	}
]

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
				.setTitle("Service actuel pour le racourcissement d'URL")
				.setDescription(`Le service actuel est \`${provider.name}\`. Celui-ci ${provider.shortcodes ? "supporte" : "ne supporte pas"} la personnalisation du lien.`)
				.setColor(bacheroFunctions.colors.primary)
			await interaction.update({ embeds: [embed] }).catch(err => {})
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Obtenir le service actuel
		var provider = await bacheroFunctions.database.get(database, `provider-${interaction.user.id}`)

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle("Service actuel pour le racourcissement d'URL")
			.setDescription(provider ? `Le service actuel est \`${provider}\`. Celui-ci ${providersList.find(a => a.name == provider)?.shortcodes ? "supporte" : "ne supporte pas"} la personnalisation du lien.` : "Aucun service n'est actuellement défini.")
			.setColor(bacheroFunctions.colors.primary)

		// Créé un select menu pour changer de service
		const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
			.setCustomId("shorten-config")
			.setPlaceholder("Changer de service par défaut")
			.addOptions(providersList.map(t => new StringSelectMenuOptionBuilder().setLabel(t.name).setValue(t.id).setDescription(`${t.shortcodes ? "Supporte" : "Ne supporte pas"} la personnalisation du lien${t.shortcodes ? " – via modal" : ""}`))))

		// Répondre à l'interaction
		interaction.reply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}