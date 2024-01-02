const { SlashCommandBuilder, EmbedBuilder, WebhookClient, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const bacheroFunctions = require("../../functions")
const escape = require("markdown-escape")

// Exporter certaines fonctions
module.exports = {
	// Quand le bot est prêt
	getClient(){
		if(!bacheroFunctions.config.getValue("bachero.module.issue", "webhookLink")) return bacheroFunctions.showLog("warn", "Le lien du webhook entré pour le module \"bachero.module.issue\" n'a pas été défini. Pour recevoir des signalements de la part des utilisateurs en rapport avec votre instance Bachero, veuillez définir un lien de webhook dans le fichier de configuration. Vous pouvez également supprimer ce module.", "report-no-webhook")
	},

	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("report")
		.setDescription("Signale un problème en rapport avec le robot")
		.addStringOption(option => option.setName("reason")
			.setDescription("Raison du signalement")
			.setRequired(true)
			.setMaxLength(1000)
			.setMinLength(12)),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Vérifier et répondre si l'utilisateur est limité, sinon on le limite
		var checkAndReply = await bacheroFunctions.cooldown.checkAndReply(interaction, "createIssueModule")
		if(checkAndReply) return; else await bacheroFunctions.cooldown.set("createIssueModule", interaction.user.id, 30000)

		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir la raison
		var reason = interaction.options.getString("reason") || "Impossible d'obtenir la raison"

		// Créer l'embed
		var embed = new EmbedBuilder()
			.setTitle(`Signalement de ${interaction.user.discriminator == "0" ? escape(interaction.user.username) : escape(interaction.user.tag)}`)
			.setDescription(reason)
			.setColor(bacheroFunctions.colors.primary)
			.setFooter({ text: `Identifiant : ${interaction.user.id}` })
			.setTimestamp()

		// Envoyer le message avec un webhook, puis confirmer en renvoyant l'interaction
		try {
			var webhook = new WebhookClient({ url: bacheroFunctions.config.getValue("bachero.module.issue", "webhookLink") })
			await webhook.send({ embeds: [embed] })
			await interaction.editReply({ content: "Votre signalement a bien été envoyé au propriétaire de cette instance.", ephemeral: true, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setURL("https://johanstick.fr/contact").setStyle(ButtonStyle.Link).setLabel("Contacter le créateur de Bachero"))] })
		} catch (err) {
			return await bacheroFunctions.report.createAndReply("envoi d'un signalement via un webhook", err, {}, interaction)
		}
	}
}