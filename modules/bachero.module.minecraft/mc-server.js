const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const fetch = require("node-fetch")
const escape = require("markdown-escape")

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName("mc-server")
		.setDescription("Vérifie et renvoie des informations sur un serveur Minecraft")
		.addSubcommand((subcommand) => subcommand
			.setName("java")
			.setDescription("Vérifie un serveur pour l'édition Java")
			.addStringOption(option => option.setName("ip")
				.setDescription("IP du serveur")
				.setMaxLength(320)
				.setRequired(true)),)
		.addSubcommand((subcommand) => subcommand
			.setName("bedrock")
			.setDescription("Vérifie un serveur pour l'édition Bedrock")
			.addStringOption(option => option.setName("ip")
				.setDescription("IP du serveur")
				.setMaxLength(320)
				.setRequired(true)),),

	// Code à exécuter quand la commande est appelée
	async execute(interaction){
		// Mettre la réponse en defer
		if(await interaction.deferReply().catch(err => { return "stop" }) == "stop") return

		// Obtenir l'adresse IP et l'édition
		var ip = interaction.options.getString("ip")
		var edition = interaction.options.getSubcommand()

		// Obtenir les informations du serveur
		var infos = await fetch(`https://api.mcstatus.io/v2/status/${edition || "java"}/${ip}`, { headers: { "User-Agent": "BacheroBot (+https://github.com/bacherobot/bot)" } }).catch(err => { return { message: err } })
		var cache_hit = infos.headers.get("X-Cache-Hit") == "true"
		if(cache_hit) var cache_time_remaining = infos.headers.get("X-Cache-Time-Remaining") // (en secondes)
		infos = await infos.json().catch(err => { return { message: err } })

		// Si on a une erreur
		if(infos.message || !infos?.retrieved_at) return await bacheroFunctions.report.createAndReply("requête vers l'API d'MCS", infos.message || infos, {}, interaction)

		// Créer l'embed
		var embed = new EmbedBuilder()
			.setTitle("Résultat de la vérification")
			.addFields([
				!infos.online ? { name: "Statut", value: "Hors ligne", inline: true } : undefined,
				infos.host ? { name: "Domaine", value: escape(infos.host), inline: true } : undefined,
				infos.port ? { name: "Port", value: infos.port.toString(), inline: true } : undefined,
				infos.players ? { name: "Joueurs", value: escape(`${infos?.players?.online}/${infos?.players?.max}${infos?.players?.list?.length ? ` : ${infos.players.list.map(p => p.name_clean || p.name_raw || p.uuid || p).join(", ")}` : ""}`.substring(0, 1024)), inline: true } : undefined,
				edition == "java" && infos.version ? { name: "Version", value: escape((infos.version?.name_clean || infos.version?.name_raw || infos.version?.protocol || infos.version || "Inconnu").toString()), inline: true } : undefined,
				infos?.motd?.clean && infos.motd.clean != "A Minecraft Server" ? { name: "MOTD", value: escape(infos?.motd?.clean), inline: true } : undefined,
				infos.eula_blocked ? { name: "Bloqué EULA", value: "Oui", inline: true } : undefined,
			].filter(Boolean))
			.setColor(infos.online ? bacheroFunctions.colors.primary : bacheroFunctions.colors.secondary)
			.setFooter({ text: `Sous la demande de ${interaction.user.discriminator == "0" ? interaction.user.username : interaction.user.tag}${cache_hit ? " • Provient du cache" : ""}${cache_time_remaining ? `, S'actualise dans ${cache_time_remaining} seconde${cache_time_remaining > 1 ? "s" : ""}` : ""}` })

		// Envoyer l'embed
		interaction.editReply({ embeds: [embed] }).catch(err => {})
	}
}