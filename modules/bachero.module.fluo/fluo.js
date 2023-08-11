const Discord = require("discord.js")
const bacheroFunctions = require('../../functions')
const fetch = require('node-fetch')
const htmlParser = require('node-html-parser');

function startsWith(text, array) {
  for (let i = 0; i < array.length; i++) {
    if (text.startsWith(array[i])) {
      return true;
    }
  }
  return false;
}

module.exports = {
  // Définir les infos de la commande slash
  slashInfo: new Discord.SlashCommandBuilder()
      .setName('fluo')
      .setDescription("Rechercher un arrêt dans la région Grand-Est")
      .addStringOption(option => option.setName('query')
          .setDescription("Arrêt à rechercher")
          .setRequired(true)
      ),

  // Code a executer quand la commande est appelée
  async execute(interaction){
    // Mettre la réponse en defer
    if(await interaction.deferReply({ ephemeral: false }).catch(err => { return 'stop' }) == 'stop') return

    // Si c'est une commande texte, tenter de supprimer le message d'invocation
    if(interaction.sourceType == 'textCommand'){
      try { interaction.delete().catch(err => {}) } catch(err) {} // Le choix de la sécurité
    }

    let query = interaction.options.getString('query');

    await fetch(`https://api.grandest2.cityway.fr/search/address?keywords=${query}&maxitems=10&pointtypes=4`, { method: 'GET' }).then(res => res.json()).then(async res => {
      let selectMenu = new Discord.StringSelectMenuBuilder()
          .setCustomId('select-fluo')
          .setPlaceholder('Choisissez un arrêt')
          .setMinValues(1)
          .setMaxValues(1)

      let regex = new RegExp("^(0[1-9]|[1-8][0-9]|9[0-8])[0-9]{3}$");
      let data = res.Data.filter(stop => regex.test(stop.Locality.Code))
      let postalCodes = ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"];
      data = data.filter(stop => startsWith(stop.Locality.Code, postalCodes));
      data.forEach((stop, index) => {
        selectMenu.addOptions(new Discord.StringSelectMenuOptionBuilder().setLabel(`${stop.Name}`).setDescription(`${stop.Locality.Name} - ${stop.Locality.Code}`).setValue(stop.Id.toString()))
      })

      interaction.editReply({ components: [new Discord.ActionRowBuilder().addComponents(selectMenu)] }).catch(err => {})
    });
  },

  interactionListener(listener) {
    listener.on("selectMenu", async interaction => {
      if (interaction.customId === "select-fluo") {
        fetch(`https://www.fluo.eu/api/PhysicalStop/GetStops?logicalId=${interaction.values[0]}`, { method: "GET", headers: { "Content-Type": "application/json" } }).then(res => res.json()).then(res => {
          let d = res.Data;
          let embed = new Discord.EmbedBuilder()
              .setTitle(`${d[0].Name} - Prochains départs`)
              .setColor("#FFD700")
              .setFooter({ text: "Données fournies par Fluo Grand Est" });

          fetch(`https://www.fluo.eu/fr/NextDeparture/logicalstop?logicalId=${interaction.values[0]}&group=&_=${Date.now()}`).then(res => res.text()).then(res => {
            let dom = htmlParser.parse(res);
            dom.querySelectorAll("li").forEach(li => {
              let spans = [...li.querySelectorAll("span.item-text")]
              let dest = spans.filter(span => span.classList.length === 1)[0].innerText;
              let hour = li.querySelector("span.item-text.bold.next-departure-duration.no-margin-right").innerText;
              hour = hour.split("").filter(char => char !== " ").filter(char => char !== "\n").filter(char => char !== "\r").join("");
              let type = li.querySelector(".item-img.cw-transinfo.cw-transinfo.mode-transport").getAttribute("title");
              embed.addFields({ name: `[${type}] ${dest}`, value: hour, inline: true });
            })

            interaction.message.edit({ embeds: [embed], components: [] }).catch(err => {})
          })
        })
      }
    })
  }
}