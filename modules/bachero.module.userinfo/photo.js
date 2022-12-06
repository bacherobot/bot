const { SlashCommandBuilder, EmbedBuilder, ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js')
const bacheroFunctions = require('../../functions')

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
	.setName('photo')
	.setDescription('Affiche la photo complète d\'un utilisateur')
	.addUserOption(option => option.setName('user')
		.setDescription('Sur quel utilisateur ?')
		.setRequired(false)),

	// Définir les infos du menu contextuel
	contextInfo: new ContextMenuCommandBuilder()
		.setName("Afficher la photo")
		.setType(ApplicationCommandType.User),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return 'stop' }) == 'stop') return

		// Obtenir l'identifiant de l'utilisateur
		var userId = (await interaction.options.getUser('user'))?.id || interaction.user.id

		// Obtenir l'utilisateur
		var user = await interaction.client.users.fetch(userId)
		var avatar = user.displayAvatarURL({ dynamic: true, size: 512 })
		avatar = avatar.replace('.webp?size', '.png?size') // le "?size" sert juste à éviter de remplacer le ".webp" au mauvaise endroit, par mesure de prudence

		// Créé un embed contenant la photo de profil
		var embed = new EmbedBuilder()
		.setTitle(`${user?.username}#${user?.discriminator}`)
		.setDescription(`[Lien direct vers la photo de profil](${avatar})${user.banner ? `\n[Lien direct vers la bannière](https://cdn.discordapp.com/banners/${userId}/${user.banner}?size=512)` : ''}`)
		.setColor(bacheroFunctions.config.getValue('bachero', 'embedColor'))
		.setFooter({ text: `${!user.avatar ? "Affichage d'un avatar par défaut • " : ""}Identifiant : ${userId}` })
		embed.setThumbnail(avatar)
		if(user.banner) embed.setImage(`https://cdn.discordapp.com/banners/${userId}/${user.banner}?size=512`)

		// Envoyer l'embed
		await interaction.editReply({ embeds: [embed] })
	}
}