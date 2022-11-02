const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const convert = require('color-convert')
const cherangi = require("cherangi")

// Fonction pour obtenir l'opposé d'une couleur
const invertColor = (col) => {
	col = col.toLowerCase()
	const colors = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f']
	let inverseColor = '#'
	col.replace('#','').split('').forEach(i => {
		const index = colors.indexOf(i)
		inverseColor += colors.reverse()[index]
	})
	return inverseColor
}

// Obtenir la couleur la plus proche parmis la palette TailwindCSS
const getClosestColor = (hex) => {
	/* https://github.com/zhigang1992/nearestTailwindColor/blob/master/index.js */
	// Liste des couleurs TailwindCSS
	var colors = { black: '#000', white: '#fff', slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' }, gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' }, zinc: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b' }, neutral: { 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717' }, stone: { 50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917' }, red: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d' }, orange: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12' }, amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f' }, yellow: { 50: '#fefce8', 100: '#fef9c3', 200: '#fef08a', 300: '#fde047', 400: '#facc15', 500: '#eab308', 600: '#ca8a04', 700: '#a16207', 800: '#854d0e', 900: '#713f12' }, lime: { 50: '#f7fee7', 100: '#ecfccb', 200: '#d9f99d', 300: '#bef264', 400: '#a3e635', 500: '#84cc16', 600: '#65a30d', 700: '#4d7c0f', 800: '#3f6212', 900: '#365314' }, green: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d' }, emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b' }, teal: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 300: '#5eead4', 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e', 800: '#115e59', 900: '#134e4a' }, cyan: { 50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63' }, sky: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' }, blue: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' }, indigo: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81' }, violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95' }, purple: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 300: '#d8b4fe', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 800: '#6b21a8', 900: '#581c87' }, fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75' }, pink: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 300: '#f9a8d4', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 800: '#9d174d', 900: '#831843' }, rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337' } }

	// Obtenir la couleur
	const flattenedColor = {}
	for(let colorsKey in colors){
		if(typeof colors[colorsKey] === "string") flattenedColor[colorsKey] = colors[colorsKey]
		else for(let nestedKey in colors[colorsKey]){
			flattenedColor[`${colorsKey}-${nestedKey}`] = colors[colorsKey][nestedKey]
		}
	}

	// Retourner la couleur
	const nearestColor = require('nearest-color').from(flattenedColor)
	return nearestColor(hex)
}

module.exports = {
	// Définir les infos de la commande slash
	slashInfo: new SlashCommandBuilder()
		.setName('color')
		.setDescription('Affiche des informations sur une couleur')
		.addSubcommand((subcommand) => subcommand
			.setName('hex')
			.setDescription('Affiche des informations sur une couleur hexadécimale')
			.addStringOption(option => option.setName('color')
				.setDescription("Couleur hexadécimale (avec ou sans le #)")
				.setRequired(true)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName('rgb')
			.setDescription('Affiche des informations sur une couleur RGB')
			.addNumberOption(option => option.setName('r')
				.setDescription("Valeur de rouge (0-255)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(255)
			)
			.addNumberOption(option => option.setName('g')
				.setDescription("Valeur de vert (0-255)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(255)
			)
			.addNumberOption(option => option.setName('b')
				.setDescription("Valeur de bleu (0-255)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(255)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName('hsl')
			.setDescription('Affiche des informations sur une couleur HSL')
			.addNumberOption(option => option.setName('h')
				.setDescription("Valeur de teinte (0-360)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(360)
			)
			.addNumberOption(option => option.setName('s')
				.setDescription("Valeur de saturation (0-100)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(100)
			)
			.addNumberOption(option => option.setName('l')
				.setDescription("Valeur de luminosité (0-100)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(100)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName('cmyk')
			.setDescription('Affiche des informations sur une couleur CMYK')
			.addNumberOption(option => option.setName('c')
				.setDescription("Valeur de cyan (0-100)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(100)
			)
			.addNumberOption(option => option.setName('m')
				.setDescription("Valeur de magenta (0-100)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(100)
			)
			.addNumberOption(option => option.setName('y')
				.setDescription("Valeur de jaune (0-100)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(100)
			)
			.addNumberOption(option => option.setName('k')
				.setDescription("Valeur de noir (0-100)")
				.setRequired(true)
				.setMinValue(0)
				.setMaxValue(100)
			)
		)
		.addSubcommand((subcommand) => subcommand
			.setName('random')
			.setDescription('Affiche une couleur aléatoire')
		),

	// Code a executer quand la commande est appelée
	async execute(interaction){
		// Obtenir les arguments
		var format = interaction.options.getSubcommand()
		var color
		if(format == 'hex') color = interaction.options.getString('color')
		if(format == 'rgb') color = [interaction.options.getNumber('r'), interaction.options.getNumber('g'), interaction.options.getNumber('b')]
		if(format == 'hsl') color = [interaction.options.getNumber('h'), interaction.options.getNumber('s'), interaction.options.getNumber('l')]
		if(format == 'cmyk') color = [interaction.options.getNumber('c'), interaction.options.getNumber('m'), interaction.options.getNumber('y'), interaction.options.getNumber('k')]
		if(format == 'random'){
			color = (Math.floor(Math.random() * 16777215).toString(16)).toUpperCase()
			format = 'hex'
		}

		// Liste des couleurs une fois converties
		var colors = {}

		// Convertir dans un maximum de formats
		if(color && format){
			// Convertir en HEX
			if(format != 'hex' && format == 'rgb') colors.hex = convert.rgb.hex(color)
			if(format != 'hex' && format == 'hsl') colors.hex = convert.hsl.hex(color)
			if(format != 'hex' && format == 'cmyk') colors.hex = convert.cmyk.hex(color)
			if(format == 'hex'){
				// Convertir en rgb puis en hex, pour que "fff" devienne "FFFFFF"
				colors.rgb = convert.hex.rgb(color)
				color = convert.rgb.hex(colors.rgb)
				colors.hex = color
			}

			// Convertir de HEX à tout le reste
			if(!colors.rgb) colors.rgb = convert.hex.rgb(colors.hex)
			colors.decimal = parseInt(colors.hex, 16)
			colors.hsl = convert.hex.hsl(colors.hex)
			colors.cmyk = convert.hex.cmyk(colors.hex)
			colors.hsv = convert.hex.hsv(colors.hex)
			colors.hwb = convert.hex.hwb(colors.hex)
			colors.ansi16 = convert.hex.ansi16(colors.hex)
			colors.ansi256 = convert.hex.ansi256(colors.hex)
			colors.lab = convert.hex.lab(colors.hex)
			colors.xyz = convert.hex.xyz(colors.hex)
			colors.tailwindcss = getClosestColor(colors.hex)?.name
			colors.name = cherangi(colors.hex)?.name
			colors.opposite = invertColor(colors.hex)
			colors.isDark = colors.hsl[2] < 50
		}

		// Créer l'embed
		var embed = new EmbedBuilder()
		.setTitle(colors.name)
		.setColor(colors.hex)
		.addFields([
			{ name: 'Décimale', value: '`' + colors.decimal + '`', inline: true },
			{ name: 'Hexadécimale', value: '`#' + colors.hex + '`', inline: true },
			{ name: 'Tailwind CSS', value: '`' + colors.tailwindcss + '`', inline: true },
			{ name: 'RGB', value: '`' + colors.rgb.join(', ') + '`', inline: true },
			{ name: 'HSL', value: '`' + colors.hsl.join(', ') + '`', inline: true },
			{ name: 'HSV', value: '`' + colors.hsv.join(', ') + '`', inline: true },
			{ name: 'XYZ', value: '`' + colors.xyz.join(', ') + '`', inline: true },
			{ name: 'LAB', value: '`' + colors.lab + '`', inline: true },
			{ name: 'CMYK', value: '`' + colors.cmyk.join(', ') + '`', inline: true },
			{ name: 'HWB', value: '`' + colors.hwb.join(', ') + '`', inline: true },
			{ name: 'ANSI 16', value: '`' + colors.ansi16 + '`', inline: true },
			{ name: 'ANSI 256', value: '`' + colors.ansi256 + '`', inline: true },
			{ name: 'Couleur opposée', value: '`' + colors.opposite.toUpperCase() + '`', inline: true },
			{ name: 'Est foncé ?', value: colors.isDark ? 'Oui' : 'Non', inline: true }
		])

		// Créer un bouton
		var row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
			.setURL(`https://parrot.color.pizza/color/${colors.hex}`)
			.setStyle(ButtonStyle.Link)
			.setLabel('Informations sur Color Pizza')
		)

		// Envoyer l'embed
		interaction.reply({ embeds: [embed], components: [row] })
	}
}