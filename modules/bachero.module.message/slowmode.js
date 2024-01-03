const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
var botName = bacheroFunctions.config.getValue("bachero", "botName")

// Exporter certaines fonctions
module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("slowmode")
		.setDescription("Modifie le temps utilisé pour le mode lent dans ce salon")
		.addNumberOption(option => option.setName("time")
			.setDescription("Temps à définir (en secondes)")
			.setRequired(true)
			.setMinValue(0)
			.setMaxValue(21600))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
		.setDMPermission(false),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir le temps à définir
		var nextTime = interaction.options.getNumber("time")

		// Obtenir le temps qui était actuellement défini dans le salon
		var currentTime = interaction.channel.rateLimitPerUser

		// Si le type de salon est incorrect
		if(interaction.channel.type != 0) return interaction.editReply({ content: "Cette commande ne peut qu'être exécutée dans un salon textuel." }).catch(err => {})

		// Si le temps à définir est le même que celui actuellement défini
		if(nextTime == currentTime) return interaction.editReply({ content: `Le mode lent est déjà défini sur ${currentTime} secondes.` }).catch(err => {})

		// Modifier le temps dans le salon
		try {
			// Modifier le slowmode et répondre
			interaction.channel.setRateLimitPerUser(nextTime, `${interaction.user.discriminator == "0" ? interaction.user.username : interaction.user.tag} (ID : ${interaction.user.id}) a modifié le slowmode via la commande /slowmode`).catch(err => { return err })
			interaction.editReply({ content: `Le temps à attendre entre chaque message est passé de ${currentTime} ${currentTime > 1 ? "secondes" : "seconde"} à ${nextTime} ${nextTime > 1 ? "secondes" : "seconde"}.` })

			// Créer un snipe
			bacheroFunctions.message.send("createSnipe", {
				guildId: interaction.guild.id,
				user: interaction.user,
				type: "slowmode",
				content: `Le mode lent dans <#${interaction.channel.id}> est passé de ${currentTime} ${currentTime > 1 ? "secondes" : "seconde"} à ${nextTime} ${nextTime > 1 ? "secondes" : "seconde"}.`
			})
		} catch(err) {
			// S’il y a eu une erreur
			// Note : cet embed est assez commun lorsque le bot n'a pas la permission, pour éviter de créer trop de rapports d'erreurs, cette méthode ne sera pas utilisée
			var embed = new EmbedBuilder()
				.setTitle("Impossible de modifier le mode lent")
				.setDescription(`Un problème est survenu lors de la modification des paramètres du salon :\n\`\`\`\n${err?.toString()?.replace(/`/g, " `").replace("Missing Permissions", "Je n'ai pas la permission de gérer ce salon.") || err}\n\`\`\``)
				.setColor(bacheroFunctions.colors.secondary)
				.setFooter({ text: `Si vous pensez que ce problème a quelque chose à voir avec ${botName}, n'hésitez pas à le signaler` })
			interaction.editReply({ embeds: [embed] }).catch(err => {})
		}
	}
}