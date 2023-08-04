const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const bacheroFunctions = require('../../functions')
const fetch = require('node-fetch')

function convertHexToNumber(hexColor) {
  if (hexColor.startsWith("#")) {
    hexColor = hexColor.slice(1);
  }

  return parseInt(hexColor, 16);
}

module.exports = {
  // Définir les infos de la commande slash
  slashInfo: new SlashCommandBuilder()
      .setName('short')
      .setDescription("Raccourcir une URL")
      .addStringOption(option => option.setName('url')
          .setDescription("URL à racourcir (si non spécifié, le bot va déracourcir le dernier message ou celui en réponse)")
          .setRequired(false)
      ),

  // Code a executer quand la commande est appelée
  async execute(interaction){
    if(await interaction.deferReply().catch(err => { return 'stop' }) === 'stop') return

    // Obtenir le terme de recherche
    var query = interaction.options.getString('url')

    // Si on a pas de terme de recherche, on va chercher le dernier message ou celui en réponse
    if(!query){
      // Chercher le message auquel on répond
      if(interaction?.reference?.messageId){
        var repliedTo = await interaction.channel.messages.fetch(interaction.reference.messageId)
        if(repliedTo.content.includes('https://') || repliedTo.content.includes('http://')) query = repliedTo.content
      }

      // Sinon, on prend le dernier message
      else {
        query = await interaction.channel.messages.fetch({ limit: 1, before: interaction.id })
        query = query.first()
        query = query.content
        if(!query.includes('https://') && !query.includes('http://')) query = undefined
      }
    }

    // Si on a toujours pas de terme de recherche, on affiche une erreur
    if(!query) return interaction.editReply("Pour utiliser cette commande, vous devez inclure l'argument `url` dans votre commande, ou répondre à un message contenant un lien (ne fonctionne pas via les commandes slash).").catch(err => {})
    if(!query.includes('https://') && !query.includes('http://')) return interaction.editReply("L'URL obtenu ne semble pas être un lien valide.").catch(err => {})

    let shortened = await fetch('https://api.oriondev.fr/shortener/shorten', { method: 'POST', body: JSON.stringify({ link: query }), headers: { 'Accept': "*/*", "Accept-Encoding": "gzip, deflate, br", "Connection": "keep-alive", "Content-Type": "application/json" } }).then(res => res.json()).catch(err => { return { fetcherror: err } })
    console.log(shortened);

    // Si on a une erreur
    if(shortened.fetcherror) return await bacheroFunctions.report.createAndReply("requête vers l'API de Short", shortened.fetcherror || shortened.error || shortened.message, {}, interaction)
    else if(shortened.error || shortened.statusCode) return interaction.editReply(shortened.message || shortened.error || shortened.statusCode).catch(err => {})
    if (shortened.status !== 200) return await bacheroFunctions.report.createAndReply("requête vers l'API de Short", shortened.data, {}, interaction)

    interaction.editReply({ embeds: [{
      title: "Résultat du raccourcissement",
      fields: [
        { name: 'Raccourci', value: shortened.data.shorten },
        { name: 'Original', value: shortened.data.original || query },
      ].filter(Boolean),
      color: convertHexToNumber(bacheroFunctions.config.getValue('bachero', 'embedColor')),
      footer: { text: `Sous la demande de ${interaction.user.discriminator === '0' ? interaction.user.username : interaction.user.tag}` }
    }] }).catch(err => { console.error(err); })
  }
}