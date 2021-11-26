const Discord = require('discord.js');
const path = require('path');
const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');

const { CommandHandler } = require(path.resolve(__dirname, '..', 'CommandHandler.js'));

class CommandCreateSlave extends CommandHandler {
	constructor() {
		super();
		let data = fs.readFileSync(path.resolve(__dirname, 'createSlave.json'));
		this.config = JSON.parse(data);
	}

	getCommands(commands) {
		commands.push(
			new SlashCommandBuilder()
			.setName ('createslave')
			.setDescription('Generate a slave.json configuration for the bot')
			.addUserOption(option => option
				.setName('slave')
				.setDescription('the slave (user)')
				.setRequired(true)
			)	
			.addRoleOption(option => option
				.setName('master')
				.setDescription('the master (role)')
				.setRequired(true)
			)	
			.addChannelOption(option => option
				.setName('channel')
				.setDescription('the main channel for the bot')
				.setRequired(true)
			)	
			.toJSON()
		)
	}
	
	handleCommand(interaction) {
		const { options } = interaction;
		
		let command = interaction.commandName;
		if (command!='createslave') return false;
		
		let slave = options.get('slave');
		let master = options.get('master');
		let channel = options.get('channel');

		let json = {
			name: slave.user.username,
			ids: {
				guild: slave.member.guild.id,
				discord: slave.value,
				discordchannel: channel.value,
				masterrole: master.value
			}
		}

		let text = 'Slave user: ' + slave.user.username + "\n"+
			   'Master role: ' + master.role.name + "\n" + 
			   'Channel: ' + channel.channel.name;

		let data = JSON.stringify(json, null, 2);

		let embed = new Discord.MessageEmbed()
				.setAuthor(interaction.member.displayName)
				.setTitle ('Your slave configuration')
				.setColor(0x4EE2EC);

		let telegram = '';
		if (this.config.telegramuser && (this.config.telegramuser !== ''))
			telegram = "\n\nYou can get your telegram ID by messaging "+this.config.telegramuser+" on telegram: '/getid'";
		
		embed.setDescription(text+"\n\nconfig.json:\n```json\n" + data + "```" + telegram);
                interaction.reply({content: ' ', embeds: [embed]})

		return true;
	}
}

module.exports = CommandCreateSlave;
