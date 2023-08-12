const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('qi')
        .setDescription("Connaitre son QI ou celui d'un autre membre/bot du serveur.")
        .addUserOption(option =>
            option
                .setName('membre')
                .setDescription('Le membre dont on veut connaitre le QI.')
                .setRequired(false)),

    async execute(interaction) {
        let member;
        if (!interaction.options.getUser('membre')) {
            member = interaction.user.username
        } else {
            member = interaction.options.getUser('membre')
        }
        let limite_inf = 60;
        let limite_sup = 250;
        let qi = Math.floor(Math.random() * (limite_sup - limite_inf + 1)) + limite_inf;
        
        const ranges = [
            { min: 60, max: 80, reply: `AHAHAHA T CON PUTAIN` },
            { min: 80, max: 95, reply: `t'es un peu con mais trkl` },
            { min: 95, max: 115, reply: `ça vaaa t'es normal` },
            { min: 115, max: 130, reply: `Oooooh c'est pas mal en vrai` },
            { min: 130, max: 150, reply: `T'es vraiment intelligent` },
            { min: 150, max: 160, reply: `Preque-Génie` },
            { min: 160, max: 170, reply: `Steve Jobs, Bill Gates, Einstein` },
            { min: 170, max: 225, reply: `T'ES PLUS INTELLIGENT QUE STEVE JOBS, BILL GATES ET MÊME DE EINSTEIN` },
            { min: 225, max: 250, reply: `OOOOeuuuuuu gnagna je suis le mec le plus intelligent gnagna Et va niquer ta mère` }
        ];
        
        let response = "";
        for (const range of ranges) {
            if (qi >= range.min && qi <= range.max) {
                response = `Le qi de ${member} est de ${qi} ${range.reply}`;
                break;
            }
        }
        
        interaction.reply(response);        
    }
}