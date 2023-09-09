const { SlashCommandBuilder, EmbedBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require("discord.js")
const { colors } = require("../../functions")
const escape = require("markdown-escape")

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("photo")
		.setDescription("Affiche la photo complète d'un utilisateur")
		.addUserOption(option => option.setName("user")
			.setDescription("Sur quel utilisateur ?")
			.setRequired(false)),

	// Définir les infos du menu contextuel
	contextInfo: new ContextMenuCommandBuilder()
		.setName("Afficher la photo")
		.setType(ApplicationCommandType.User),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir l'identifiant de l'utilisateur
		var userId = (await interaction.options.getUser("user"))?.id || interaction.user.id

		// Obtenir l'utilisateur
		var user = await interaction.client.users.fetch(userId, { force: true }) // forcer le fetch pour avoir la bannière
		var avatar = user.displayAvatarURL({ dynamic: true, size: 512 })
		avatar = avatar.replace(".webp?size", ".png?size") // le "?size" sert juste à éviter de remplacer le ".webp" au mauvaise endroit, par mesure de prudence

		// Si on a pas de bannière, on essaye de l'obtenir
		if(user.banner) user.banner = await user.bannerURL({ dynamic: true, size: 512 })

		// Créé un embed contenant la photo de profil
		var embed = new EmbedBuilder()
			.setTitle(`${user?.globalName ? user.globalName : ""} ${user?.globalName ? "(" : ""}${user?.discriminator == "0" ? `@${user?.username}` : escape(user?.tag)}${user?.globalName ? ")" : ""}`)
			.setDescription(`[Lien direct vers la photo de profil](${avatar})${user.banner ? `\n[Lien direct vers la bannière](${user.banner})` : ""}`)
			.setColor(colors.primary)
			.setFooter({ text: `${!user.avatar ? "Affichage d'un avatar par défaut • " : ""}Identifiant : ${userId}` })
		if(user.banner) embed.setThumbnail(avatar); else embed.setImage(avatar)
		if(user.banner) embed.setImage(user.banner)

		// Envoyer l'embed
		await interaction.editReply({ embeds: [embed] }).catch(err => {})
	}
}