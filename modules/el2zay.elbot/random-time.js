const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, time } = require('discord.js')
const { isValid } = require('date-fns');

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('random-time')
        .setDescription('Générer un temps ou une date aléatoire.')
        .addStringOption(option => option.setName('type')
            .setDescription("Dans combien de temps le sondage se termine ?")
            .setChoices(
                { name: 'JJ/MM/AAAA hh:mm', value: 'time-date' },
                { name: 'JJ/MM/AAAA', value: 'date' },
                { name: 'hh:mm:ss', value: 'time' },
            )
            .setRequired(true)),

    async execute(interaction) {
        var timeString;
        var relative;
        var type = interaction.options.getString('type');
        var date = new Date();

        // Faire réfléchir le bot
        let msg = await interaction.deferReply();

        function generateRandomDate(type, date) {
            if (type == 'time-date') {
                date.setFullYear(new Date().getFullYear() + 1);
                date.setMonth(Math.floor(Math.random() * 12));
                date.setDate(Math.floor(Math.random() * 30) + 1);
                date.setHours(Math.floor(Math.random() * 24));
                date.setMinutes(Math.floor(Math.random() * 60));
                date.setSeconds(Math.floor(Math.random() * 60));
            }
            if (type == 'date') {
                date.setFullYear(new Date().getFullYear() + 1);
                date.setMonth(Math.floor(Math.random() * 12));
                date.setDate(Math.floor(Math.random() * 30) + 1);
            }
            if (type == 'time') {
                date.setHours(Math.floor(Math.random() * 24));
                date.setMinutes(Math.floor(Math.random() * 60));
                date.setSeconds(Math.floor(Math.random() * 60));
            }

            while ((date < new Date() || !isValid(date)) && type !== 'time') {
                date = new Date();
                generateRandomDate(type, date);
            }
            // Formater la date en JJ/MM/AAAA hh:mm:ss
            if (type == 'time-date') timeString = time(date, 'F')
            // Formater la date en JJ/MM/AAAA
            else if (type == 'date') timeString = time(date, 'D')
            // Formater la date en hh:mm:ss
            else timeString = time(date, 'T')

            relative = time(date, 'R');
            return date;
        }

        generateRandomDate(type, date);

        // Créé un bouton pour relancer
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`relancer-${msg.id}`)
                .setLabel('Relancer')
                .setStyle(ButtonStyle.Primary),
            // Ajouter un bouton alerter
            new ButtonBuilder()
                .setCustomId(`alerter-${msg.id}`)
                .setLabel('Alerter')
                .setStyle(ButtonStyle.Primary)
        )

        await interaction.editReply({ content: `${timeString} ${relative}`, components: [row] })
        const filter = i => i.customId == `relancer-${msg.id}` || i.customId == `alerter-${msg.id}`
        const collector = interaction.channel.createMessageComponentCollector({ filter })
        collector.on('collect', async i => {
            if (i.customId == `relancer-${msg.id}`) {
                // Si la personne qui clique n'est pas interaction.user.id
                if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true }).catch(err => { })
                // Générer une nouvelle date
                generateRandomDate(type, date);
                await i.update({ content: `${timeString} ${relative}`, components: [row] }).catch(err => { }).catch(err => { })
                // await i.update({ content: `${timeString} ${relative}`, components: [row] }).catch(err => { })
            }
            if (i.customId == `alerter-${msg.id}`) {
                // Alerter la personne qui a lancé la commande
                await interaction.followUp({ content: `Vous serez alerter ${timeString} ${relative}`, ephemeral: true }).catch(err => { }).catch(err => { })
                // TODO Executer la commande timer
            }
        })
    }
}