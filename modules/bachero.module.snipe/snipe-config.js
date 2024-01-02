const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.snipe")

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("snipe-config")
		.setDescription("Configure si les messages supprimés devraient être enregistrés pour ce serveur")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le bouton
	async interactionListener(listener){
		listener.on("button", async (interaction) => {
			// Si l'identifiant du bouton est "snipeConfig-safety"
			if(interaction.customId == "snipeConfig-safety"){
				var embed = new EmbedBuilder()
					.setTitle("Confidentialité des données avec la fonctionnalité Snipe")
					.setDescription(`Nous tenons à la vie privée de nos utilisateurs, nous avons donc mis en place certaines mesures listées ici :\n
				• Les messages supprimés sont enregistrés dans une base de données non persistante : ils sont supprimés à chaque redémarrage de l'infrastructure ou après 24 heures.
				• Les messages qui ont été envoyés il y a plus de trois jours, ou envoyés par un robot ne sont pas enregistrés.
				• La fonctionnalité est désactivée par défaut sur tous les serveurs, et doit être activée par un membre ayant la permission de gérer le serveur.
				• Il est impossible pour un modérateur d'exporter toutes les données enregistrées sur un serveur.
				• Notre base de données n'inclut que 500 messages par serveur, les anciens messages seront supprimés si le serveur dépasse cette limite.
				• Seules les informations suivantes sont enregistrées : les identifiants du message, de l'utilisateur et du salon ; le tag de l'auteur ; le contenu du message ; la date de suppression ou de modification ; les attachements.`)
					.setColor(bacheroFunctions.colors.primary)
				return interaction.reply({ embeds: [embed], ephemeral: true }).catch(err => {})
			}

			// Vérifier l'identifiant du bouton, puis defer l'interaction
			if(interaction.customId != "snipeConfig-disable" && interaction.customId != "snipeConfig-enable") return
			if(interaction.user.id != interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})
			await interaction.deferReply().catch(err => {})

			// Modifier la valeur dans la base de données
			if(interaction.customId == "snipeConfig-disable") await bacheroFunctions.database.delete(database, `enabled-${interaction.guild.id}`)
			else await bacheroFunctions.database.set(database, `enabled-${interaction.guild.id}`, true)

			// Modifier le message d'origine, et supprimer l'interaction
			await interaction.deleteReply().catch(err => {})
			await interaction.message.edit({ content: `La fonctionnalité Snipe est désormais ${interaction.customId == "snipeConfig-disable" ? "désactivée sur ce serveur" : "activée sur l'ensemble de ce serveur"}.\nCette modification peut prendre jusqu'à 2 minutes pour s'appliquer.`, embeds: [], components: [] }).catch(err => {})
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Vérifier si la fonctionnalité est activée
		var isEnabled = await bacheroFunctions.database.get(database, `enabled-${interaction.guild.id}`)

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle("Configuration de la fonctionnalité Snipe")
			.setDescription(isEnabled ? "La fonctionnalité Snipe est activée sur l'ensemble de ce serveur.\nCelle-ci détecte lorsqu'un utilisateur supprime un message et permet aux modérateurs de l'afficher à nouveau en utilisant la commande `snipe`." : "La fonctionnalité Snipe est désactivée sur ce serveur.\nLorsqu'elle est activée, elle détecte lorsqu'un utilisateur supprime un message sur votre serveur et permet aux modérateurs de l'afficher à nouveau en utilisant la commande `snipe`.")
			.setColor(bacheroFunctions.colors.primary)

		// Créé deux boutons
		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(isEnabled ? "snipeConfig-disable" : "snipeConfig-enable")
				.setLabel(isEnabled ? "Désactiver la fonctionnalité" : "Activer la fonctionnalité")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId("snipeConfig-safety")
				.setLabel("Comment votre confidentialité reste assurée")
				.setStyle(ButtonStyle.Secondary),
		)

		// Répondre à l'interaction
		interaction.reply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}