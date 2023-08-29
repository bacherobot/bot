// On importe quelques éléments via discord.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

// Et on exporte ce qu'il faut
module.exports = {
	slashInfo: new SlashCommandBuilder()
		.setName('nuke')
		.setDescription('Supprimer un salon entièrement puis le recréé identiquement sans les messages.')
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ManageMessages)
		.setDMPermission(false)

		.addBooleanOption(option =>
			option
				.setName('recreer')
				.setDescription('Si le salon doit être recréé.')
				.setRequired(true)),

	async execute(interaction) {
		let msg = await interaction.deferReply()

		// Si l'utilisateur n'a pas la permission de gérer les salons, on lui dit
		const rowConfirm = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`no-${msg.id}`)
				.setLabel('Ouais bon au final non')
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`yes-${msg.id}`)
				.setLabel('🧨 Continuer 🧨')
				.setStyle(ButtonStyle.Danger),
		)

		// Créer un embed pour demander confirmation
		embed = new EmbedBuilder()
			.setTitle("ATTENTION !!!")
			.setDescription("Cette commande permet d'effacer ce salon !!!! Cette action est **irréversible**\nSouhaitez-vous effectuer quand même la commande ?")
			.setColor(0xff0000)
			.setThumbnail("https://github.com/bacherobot/ressources/blob/main/elbot/elbot%20attention.jpeg?raw=true")
		interaction.editReply({ embeds: [embed], components: [rowConfirm], ephemeral: true }).catch(err => { })
		// Quand quelqu'un clique sur le bouton
		const filter_confirm = i => i.customId == `yes-nuke` || i.customId == `no-nuke`
		const collector_confirm = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, filter: filter_confirm })
		collector_confirm.on('collect', async i => {
			// Vérifier que la personne a les permissions de gérer les messages ou de gérer le salon
			if (!interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageChannels) && !interaction.channel.permissionsFor(i.user).has(PermissionFlagsBits.ManageMessages)) return i.reply({ content: ":no_entry_sign: Tu ne sembles pas avoir la permission de gérer les messages ou de gérer ce salon.", ephemeral: true })

			// Si l'utilisateur ne veut plus supprimer le salon
			if (i.customId == `no-${msg.id}`) {
				// Modifier l'embed pour dire que l'opération a été annulée
				embed = new EmbedBuilder()
					.setTitle("Opération annulée")
					.setDescription("Ce salon ne sera pas nuké !")
					.setColor(0x00ff00)

				// Modifier l'interaction
				return interaction.editReply({ embeds: [embed], components: [], ephemeral: true }).catch(err => { })
			}

			if (i.customId == `yes-${msg.id}`) {
				// Récupérer le salon
				const channel = interaction.channel;

				// Récupérer les paramètres du salon
				const name = channel.name;
				const type = channel.type;
				const parent = channel.parentID;
				const permissionOverwrites = channel.permissionOverwrites;
				await interaction.channel.send("ADIOS AMIGOS !")
				await interaction.channel.send("https://tenor.com/view/explosion-gif-13800218")

				// Ne rien faire pendant 2 secondes le temps que le gif se finisse
				await new Promise(resolve => setTimeout(resolve, 2000))

				// Supprimer le salon
				channel.delete()
					.then(() => {

						// Récupérer le serveur
						const guild = interaction.guild;

						// TODO :  Recréer le salon avec les mêmes paramètres
						guild.createChannel(name, type, {
							parent: parent,
							permissionOverwrites: permissionOverwrites
						})
							.then(channel => {
								// Envoyer un message dans le nouveau salon
								channel.send("Salon nuké !");
							})
							.catch(error => console.error(error));
					})
					.catch(error => console.error(error));
			}
		})
	}
}
