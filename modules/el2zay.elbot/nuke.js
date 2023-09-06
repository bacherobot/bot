// On importe quelques éléments via discord.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js")
const bacheroFunctions = require("../../functions")
const escape = require("markdown-escape")
var elbotStyle = bacheroFunctions.config.getValue("bachero", "elbotStyleInErrors")

// Et on exporte ce qu'il faut
module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName("nuke")
		.setDescription("Supprimer un salon entièrement et le dupliquer pour effacer les messages")
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageMessages)
		.setDMPermission(false),

	async execute(interaction){
		// Defer l'interaction
		let msg = await interaction.deferReply().catch(err => {})

		// Créer les boutons de confirmations
		const rowConfirm = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`nukeCmd-no-${msg.id}`)
				.setLabel("Ouais bon au final non")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(`nukeCmd-yes-${msg.id}`)
				.setLabel("Continuer")
				.setStyle(ButtonStyle.Danger),
		)

		// Créer un embed pour demander confirmation, et répondre avec
		var embed = new EmbedBuilder()
			.setTitle("ATTENTION !!!")
			.setDescription("⚠️ Cette commande va effacer certaines informations présentes dans ce salon. **Cette action est irréversible** !\n\n• Seront supprimés : les messages, les webhooks, les intégrations.\n• Sera réinitialisé : l'identifiant du salon.")
			.setColor(bacheroFunctions.colors.danger)
		if(elbotStyle) embed.setThumbnail("https://github.com/bacherobot/ressources/blob/main/elbot/elbot%20attention.jpeg?raw=true")
		await interaction.editReply({ embeds: [embed], components: [rowConfirm] }).catch(err => {})

		// Quand quelqu'un clique sur le bouton
		const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.customId == `nukeCmd-yes-${msg.id}` || i.customId == `nukeCmd-no-${msg.id}` })
		collector_confirm.on("collect", async i => {
			// Vérifier que la personne a les permissions de gérer les messages ou de gérer le salon
			if(!interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageChannels) && !interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageMessages)) return i.reply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission de gérer les messages ou de gérer ce salon.", ephemeral: true }).catch(err => {})

			// Si l'utilisateur ne veut plus supprimer le salon
			if(i.customId == `nukeCmd-no-${msg.id}`){
				return i.update({ content: "Opération annulé !", embeds: [], components: [] }).catch(err => {})
			}

			// Mais s'il veut vraiment
			if(i.customId == `nukeCmd-yes-${msg.id}`){
				// Récupérer la position du salon
				const channelPos = interaction.channel.position

				// Dire que le salon va être supprimé
				await interaction.channel.send("ADIOS AMIGOS ! https://tenor.com/view/explosion-gif-13800218").catch(err => {})

				// Ne rien faire pendant 1 seconde pour que la personne puisse voir le message
				await new Promise(resolve => setTimeout(resolve, 1000))

				// On clone le salon
				var cloned = await interaction.channel.clone().catch(err => { return { err: err } })
				if(cloned.err) return bacheroFunctions.report.createAndReply("clonage du salon", cloned.err || cloned, {}, interaction)

				// On supprime l'ancien
				var deleted = await interaction.channel.delete().catch(err => { return { err: err } })
				if(deleted.err) return bacheroFunctions.report.createAndReply("suppression de l'ancien salon", deleted.err || deleted, {}, interaction)

				// On change sa position
				await cloned.setPosition(channelPos).catch(err => { return { err: err } })

				// On envoie un message dans le nouveau salon
				await cloned.send(`Nuke posé dans le salon par ${i.user?.globalName ? i.user.globalName : ""} ${i.user?.globalName ? "(" : ""}${i.user?.discriminator == "0" ? `${i.user?.username}` : escape(i.user?.tag)}${i.user?.globalName ? ")" : ""} (<@${i.user?.id}>).`).catch(err => {})
			}
		})
	}
}
