const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const database = bacheroFunctions.database.getDatabase("textCommandDisabledGuilds")

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("slash-to-text")
		.setDescription("Configure l'utilisation de commande textes par messages, sans utiliser le préfixe slash (/).")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false),

	// Récupérer le listener et savoir lorsque quelqu'un renvoie le bouton
	async interactionListener(listener){
		listener.on("button", async (interaction) => {
			// Vérifier l'identifiant du bouton, puis defer l'interaction
			if(interaction.customId != "textCommand-disable" && interaction.customId != "textCommand-enable") return
			if(interaction.user.id != interaction?.message?.interaction?.user?.id && interaction.user.id != interaction?.message?.mentions?.repliedUser?.id) return interaction.reply({ content: "Il semblerait que tu ne sois pas la personne que j'attendais...", ephemeral: true }).catch(err => {})
			await interaction.deferReply().catch(err => {})

			// Modifier la valeur dans la base de données
			if(interaction.customId == "textCommand-enable") await bacheroFunctions.database.delete(database, interaction.guild.id)
			else await bacheroFunctions.database.set(database, interaction.guild.id, true)

			// Modifier le message d'origine, et supprimer l'interaction
			await interaction.deleteReply().catch(err => {})
			await interaction.message.edit({ content: `La fonctionnalité d'utilisation des commande slash en message est désormais ${interaction.customId == "textCommand-disable" ? "désactivée sur ce serveur" : "activée sur l'ensemble de ce serveur"}.`, embeds: [], components: [] }).catch(err => {})
		})
	},

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Vérifier si la fonctionnalité est désactivée
		var isDisabled = await bacheroFunctions.database.get(database, interaction.guild.id)

		// Créer un embed
		var embed = new EmbedBuilder()
			.setTitle("Configuration des commandes textes")
			.setDescription(`${isDisabled ? "La fonctionnalité d'utilisation des commandes slash en message est désactivée sur ce serveur." : "La fonctionnalité d'utilisation des commandes slash en message est activée sur l'ensemble de ce serveur."}\nAvec cette fonctionnalité, les commandes slash peuvent être utilisées via un message classique en utilisant le préfixe \`${bacheroFunctions.config.getValue("bachero", "prefix")}\` au début de votre message.\n\n> Cette fonctionnalité passe outre les permissions et dérogations définies depuis les paramètres de votre serveur Discord.`)
			.setColor(bacheroFunctions.colors.primary)

		// Créé un bouton
		const row = new ActionRowBuilder().addComponents(new ButtonBuilder()
			.setCustomId(isDisabled ? "textCommand-enable" : "textCommand-disable")
			.setLabel(isDisabled ? "Activer la fonctionnalité" : "Désactiver la fonctionnalité")
			.setStyle(ButtonStyle.Primary))

		// Répondre à l'interaction
		interaction.reply({ embeds: [embed], components: [row] }).catch(err => {})
	}
}