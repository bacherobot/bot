const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { config } = require('../../functions')
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

// TODO : Régler ça
var tokens = process.env.REMOVEBG_TOKENS.length ? JSON.parse(process.env.REMOVEBG_TOKENS) : [];
if(!tokens?.length) return bacheroFunctions.showLog('warn', `Aucune clés d'API pour la commande removebg du module "el2zay.elbot" n'a pu être trouvé. La commande sera désactivé`, id="removebgcmd-no-tokens")

var token = tokens[0]

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('removebg')
        .setDescription("Retirer l'arrière plan d'une image.")
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription("URL de l'image.")
                .setRequired(true)),

    async execute(interaction) {
        var token;

        await interaction.deferReply()
        const formData = new FormData();
        formData.append('size', 'auto');
        formData.append('image_url', interaction.options.getString('url'));

        // Dire combien de credit il reste sur l'api
        fetch('https://api.remove.bg/v1.0/account', {
            headers: {
                'X-Api-Key': process.env.REMOVEBG_TOKEN1,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    console.log(`Erreur: ${response.status} ${response.statusText}`);
                }
                return response.json(); // Parse la réponse JSON
            })
            .then((data) => {
                console.log(data)
                if (!data?.data?.attributes?.credits) token = tokens.length > 1 ? tokens[tokens.indexOf(token) + 1] : tokens[0]
            })
            .catch((error) => {
                console.error(error.message);
            });


        await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Api-Key': token,
            },
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Erreur: ${response.status} ${response.statusText}`);
                }
                const buffer = await response.buffer();

                fs.writeFileSync('no-bg.png', Buffer.from(buffer));
                // Créé un embed
                var embed = new EmbedBuilder()
                    .setTitle('Image sans arrière plan')
                    .setImage('attachment://no-bg.png')
                    .setColor(config.getValue('bachero', 'embedColor'))
                    .setFooter({ text: `Powered By remove.bg`, iconURL: 'https://remove.bg/favicon.ico' });
                // Envoie l'embed dans le salon
                interaction.editReply({ embeds: [embed], files: ['no-bg.png'] });
            })
            .catch((error) => {
                console.error(error.message);
            });
    }

}
