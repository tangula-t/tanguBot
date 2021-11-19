const Discord  = require('discord.js');
const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandHandler } = require(path.resolve(__dirname, '..', 'CommandHandler.js'));

class ExampleCommand extends CommandHandler {
	constructor(bot) {
		super(bot);
		let data = fs.readFileSync(path.resolve(__dirname, 'example.json'));
		this.config = JSON.parse(data);
	}
	
	meta() {
		return {
			"name": 'example',  // !example
			"description": 'Does something',
			"role": 'Member'
		}
	}
	
	getCommands(commands) {
		commands.push(
			new SlashCommandBuilder()
			.setName ('example')
			.setDescription('Does something')
			.toJSON()
		)
	}
	
	handleCommand(interaction) {
		if (!this.guilds.includes(''+interaction.guild.id)) { return false; }
		
		let command = interaction.commandName;
		if (command==='example') {
			this.doCommand(interaction)
			return true;
		}
		return false;
	}
	
	async doCommand (interaction) {
		interaction.deferReply({
			ephemeral: false
		});
		
		/// do your thing
		
		interaction.editReply({
			content: 'I did something' 
		});

	}
	
	async handleTextCommand (message, args) {
		message.channel.send('I did something');
	}
}

module.exports = ExampleCommand;
