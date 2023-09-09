const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.autolink")

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("autolink-config")
		.setDescription("Configure l'utilisation de la fonctionnalité AutoLink sur ce serveur")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.setDMPermission(false),

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le bouton
	async interactionListener(listener){
		listener.on("button", async (interaction) => {
			// Vérifier l'identifiant du bouton, puis defer l'interaction
			if(interaction.customId != "autolinkConfig-disable" && interaction.customId != "autolinkConfig-enable") return
			if(interaction.user.id != interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})
			await interaction.deferReply().catch(err => {})

			// Modifier la valeur dans la base de données
			if(interaction.customId == "autolinkConfig-disable") await bacheroFunctions.database.delete(database, `enabled-${interaction.guild.id}`)
			else await bacheroFunctions.database.set(database, `enabled-${interaction.guild.id}`, true)

			// Modifier le message d'origine, et supprimer l'interaction
			await interaction.deleteReply().catch(err => {})
			await interaction.message.edit({ content: `La fonctionnalité AutoLink est désormais ${interaction.customId == "autolinkConfig-disable" ? "désactivée sur ce serveur" : "activée sur l'ensemble de ce serveur"}.`, embeds: [], components: [] }).catch(err => {})
		})
	},

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Vérifier si la fonctionnalité est activée
		var isEnabled = await bacheroFunctions.database.get(database, `enabled-${interaction.guild.id}`)

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle("Configuration d'AutoLink")
			.setColor(bacheroFunctions.config.getValue("bachero", "embedColor"))
		if(isEnabled) embed.setDescription("La fonctionnalité AutoLink est activée sur l'ensemble de ce serveur.\nCelle-ci détecte les messages envoyés par n'importe qui sur votre serveur et en extrait certains liens, pour afficher des détails dans un embed.\n\n:warning: Les liens ne sont pas vérifiés et peuvent être malicieux.")
		else embed.setDescription("La fonctionnalité AutoLink est désactivée sur ce serveur.\nLorsqu'elle est activée, elle détecte les messages envoyés par les utilisateurs et en extrait certains liens, pour en afficher des détails simplifiés.\n\n:warning: Les liens ne sont pas vérifiés et peuvent être malicieux, à activer avec prudence.")

		// Créé un bouton
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(isEnabled ? "autolinkConfig-disable" : "autolinkConfig-enable")
			.setLabel(isEnabled ? "Désactiver la fonction" : "Activer la fonctionnalité")
			.setStyle(ButtonStyle.Primary),)

		// Répondre à l'interaction
		interaction.reply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}