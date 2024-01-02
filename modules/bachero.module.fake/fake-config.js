const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("bachero.module.fake")

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("fake-config")
		.setDescription("Configure la permission requise pour utiliser la commande fake sur ce serveur")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks)
		.setDMPermission(false),

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le bouton
	async interactionListener(listener){
		listener.on("button", async (interaction) => {
			// Vérifier l'identifiant du bouton, puis defer l'interaction
			if(interaction.customId != "fakeConfig-disableForAll" && interaction.customId != "fakeConfig-enableForAll") return
			if(interaction.user.id != interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})
			await interaction.deferReply().catch(err => {})

			// Modifier la valeur dans la base de données
			if(interaction.customId == "fakeConfig-disableForAll") await bacheroFunctions.database.delete(database, `everyoneUse-${interaction.guild.id}`)
			else await bacheroFunctions.database.set(database, `everyoneUse-${interaction.guild.id}`, true)

			// Modifier le message d'origine, et supprimer l'interaction
			await interaction.deleteReply().catch(err => {})
			await interaction.message.edit({ content: `La commande \`fake\` est désormais utilisable ${interaction.customId == "fakeConfig-disableForAll" ? "par les modérateurs uniquement" : "par tout le serveur"}.`, embeds: [], components: [] }).catch(err => {})
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Vérifier si la commande /fake est activée pour tout le monde
		var isEnableForAll = await bacheroFunctions.database.get(database, `everyoneUse-${interaction.guild.id}`)

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle("Configuration de la commande fake")
			.setColor(bacheroFunctions.colors.primary)
		if(isEnableForAll != true) embed.setDescription("La commande `fake` permet d'\"usurper l'identité\" de quelqu'un en envoyant un message sous l'identité de cette personne.\nEn raison des problèmes qu'elle peut poser, elle est désactivée par défaut.")
		else embed.setDescription("La commande `fake` permet d'\"usurper l'identité\" de quelqu'un en envoyant un message sous l'identité de cette personne.\nEn raison des problèmes qu'elle peut poser, elle est désactivée par défaut mais un membre du staff de ce serveur a tout de même décidé de la rendre disponible pour tous les membres.")

		// Créé un bouton
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(isEnableForAll ? "fakeConfig-disableForAll" : "fakeConfig-enableForAll")
			.setLabel(isEnableForAll ? "Désactiver par défaut" : "Activer pour tout le monde")
			.setStyle(ButtonStyle.Primary),)

		// Répondre à l'interaction
		interaction.reply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}