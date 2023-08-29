const { SlashCommandBuilder } = require('discord.js')
const bacheroFunctions = require('../../functions')
const database = bacheroFunctions.database.getDatabase('el2zay.elbot')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('qi')
        .setDescription("Connaitre son QI ou celui d'un autre membre/bot du serveur.")
        .addUserOption(option =>
            option
                .setName('membre')
                .setDescription('Le membre dont on veut connaitre le QI.')
                .setRequired(false))

        .addBooleanOption(option =>
            option
                .setName('delete')
                .setDescription('Vide la bdd (sera enlever a la fin des tests)')
                .setRequired(false)),


    async execute(interaction) {
        let member;
        if (!interaction.options.getUser('membre')) {
            member = interaction.user
        } else {
            member = interaction.options.getUser('membre')
        }

        if (await bacheroFunctions.database.get(database, `qi-${member.id}`)) {
            return interaction.reply(`Le qi de ${member.username} est de ${await bacheroFunctions.database.get(database, `qi-${member.id}`)}`)
        }

        let limite_inf = 60;
        let limite_sup = 250;
        let qi = Math.floor(Math.random() * (limite_sup - limite_inf + 1)) + limite_inf;

        const ranges = [
            { min: 60, max: 80, reply: `AHAHAHA T CON PUTAIN 😹😹😹` },
            { min: 80, max: 95, reply: `T'es un peu con mais trkl` },
            { min: 95, max: 115, reply: `ça vaaa t'es normal` },
            { min: 115, max: 130, reply: `Oooooh c'est pas mal en vrai` },
            { min: 130, max: 150, reply: `Olala tu es intelligent.` },
            { min: 150, max: 160, reply: `Oh le` },
            { min: 160, max: 170, reply: `Scuse nous` },
            { min: 170, max: 225, reply: `Oh le melon de fou` },
            { min: 225, max: 250, reply: `OOOOeuuuuuu gnagna je suis le mec le plus intelligent gnagna Et va te faire enculer` }
        ];

        let response = "";
        for (const range of ranges) {
            if (qi >= range.min && qi <= range.max) {
                response = `Le qi de ${member.username} est de ${qi} ${range.reply}`;
                // Enregistrer le QI dans la base de données
                await bacheroFunctions.database.set(database, `qi-${member.id}`, qi)

                break;
            }
        }
        interaction.reply(response);

        //TODO : Leaderboard de qi.

        
    }
}