const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js')
const fetch = require("node-fetch");

module.exports = {
    slashInfo: new SlashCommandBuilder()
        .setName('random-map-point')
        .setDescription('Génère un point GPS au hasard.'),

    async execute(interaction) {
        // Générer la latitude et la longitude en évitant les mers et les océans
        var latitude = Math.random() * (90 - -90) + -90;
        var longitude = Math.random() * (180 - -180) + -180;
        let msg = await interaction.deferReply()
        const link = `https://maps.apple.com/?q=${latitude},${longitude}`;


        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`relancer-${msg.id}`)
                .setLabel('Relancer')
                .setStyle(ButtonStyle.Primary),
            // TODO faire cohabiter le bouton relancer et ouvrir qui est un lien.
            // new ButtonBuilder()
            //     .setCustomId(`open-${msg.id}`)
            //     .setLabel('Ouvrir')
            //     .setStyle(ButtonStyle.Link)
            //     .setURL(link),
        )
        var placeName = await getPlaceName(latitude, longitude);


        // Créer l'embed
        var embed = new EmbedBuilder()
            .setTitle(`Point GPS généré`)
            .setDescription(`Latitude: ${latitude}\nLongitude: ${longitude}\nNom du lieu: ${placeName || "Aucun nom trouvé"}`)
            .setImage(`https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=13&size=600x300&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${process.env.GOOGLE_API_KEY}`)
        interaction.editReply({ embeds: [embed], components: [row] })
            .catch((error) => {
                console.error(error);
            })


        const filter = i => i.customId === `relancer-${msg.id}` || i.customId === `open-${msg.id}`
        const collector = interaction.channel.createMessageComponentCollector({ filter })
        collector.on('collect', async i => {
            if (i.customId == `relancer-${msg.id}`) {
                // Si la personne qui clique n'est pas interaction.user.id
                if (i.user.id !== interaction.user.id) return i.reply({ content: "Seul l'utilisateur qui a lancé la commande peut relancer.", ephemeral: true })
                var latitude = Math.random() * (90 - -90) + -90;
                var longitude = Math.random() * (180 - -180) + -180;
                // Eviter les océans et les mers.
                var placeName = await getPlaceName(latitude, longitude);

                embed.setDescription(`Latitude: ${latitude}\nLongitude: ${longitude}\nNom du lieu: ${placeName || "Aucun nom trouvé"}`)
                embed.setImage(`https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=13&size=600x300&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${process.env.GOOGLE_API_KEY}`)
                await i.update({ embeds: [embed], components: [row] })
            }
        })
    }
}
// TODO jsp si ça marche
async function getPlaceName(latitude, longitude) {
    const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_API_KEY}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.results.length > 0) {
            return data.results[0].formatted_address;
        } else {
            throw new Error("No results found");
        }
    } catch (error) { }
}