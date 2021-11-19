const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const orderUtil = require('./orders.js');
const TaskLists = require('./TaskLists.js');
const TaskInstance = require('./TaskInstance.js');
const { CommandHandler } = require(path.resolve(__dirname, '..', 'CommandHandler.js'));

const slaveJSON = 'slave.json';
const configJSON = 'config.json';

class ChatMaster extends CommandHandler {
	constructor(bot, slavePath) {
		super(bot);
		this.slavePath = slavePath;
		this.slave = {};
		this.config = {};
		this.discord = {};
		this.loadConfigJSON();
		if (this.config.name == 'EXAMPLE') { 
			this.guilds = [0];
			return;
		}
		this.tasklists = new TaskLists(this.slavePath);
		this.guilds = [ this.config.ids.guild ]; 

		this.reload()
			.then(()=>{
				this.messagePrivate('Bot has started');
				console.log('master loaded for ' + this.config.name);
			});
	}

	async reload() {
		await this.reloadSlave()
			.then(()=>{this.reloadLocations()})
			.then(()=>{this.tasklists.reload()})
			.then(()=>{console.log("Reloaded: " + this.config.name)});
	}

	loadConfigJSON() {
		let data = fs.readFileSync(path.resolve(this.slavePath, configJSON));
		this.config = JSON.parse(data);
	}

	loadSlaveJSON() {
		let data = fs.readFileSync(path.resolve(this.slavePath, slaveJSON));
		this.slave = JSON.parse(data);
	}

	async reloadSlave() {
		this.loadSlaveJSON();

		this.discord.channel = await this.bot.discord.channels.cache.get(this.config.ids.discordchannel);
		if (!this.discord.channel) {
			console.log('ERROR: Channel not found: ' + this.config.ids.discordchannel);
		}
	
		this.discord.user = await this.bot.discord.users.fetch(this.config.ids.discord, []); 
		if (!this.discord.user) {
			console.log('ERROR: User not found: ' + this.config.ids.discord);
		}
	}

	async saveSlave() {
		let data = JSON.stringify(this.slave, null, 2);
		fs.writeFileSync(path.resolve(this.slavePath, slaveJSON), data);
	}

	applyStatus(stateChange) {
		if (!stateChange) { return; }

		for (let state in stateChange) {
			let change = stateChange[state];
			if (Number.isInteger(change)) {
				if (!(state in this.slave.state)) { 
					this.slave.state[state] = change 
				} else {
					let old = this.slave.state[state];
					if (Number.isInteger(old)) {
						this.slave.state[state] = old + change;
					} else {
						this.slave.state[state] = change;
					}
				}
			} else {
				this.slave.state[state] = change;
			}
		}
		this.saveSlave();
	}

	async reloadLocations() {
		// Load master locations
		let data = fs.readFileSync(path.resolve(this.slavePath, 'locations.json'));
		this.locations = JSON.parse(data);
	
		if (!this.slave.location) { 
			this.slave.location = 'unknown'; 
			console.log('Warning: Slave location: Unknown');
		}
	}
	
	getCommands(commands) {
		commands.push(
			new SlashCommandBuilder()
			.setName ('slave')
			.setDescription('Masters commands for the slave')
			.addSubcommand(subcommand => subcommand
				.setName('wake')
				.setDescription('Involuntary wake up'))
			.addSubcommand(subcommand => subcommand
				.setName('reload')
				.setDescription('Reload (slave) configuration'))
			.toJSON()
		);
		
		commands.push(
			new SlashCommandBuilder()
			.setName ('master')
			.setDescription('Masters commands for the master')
			.addSubcommand(subcommand => subcommand
				.setName('reload')
				.setDescription('Reload (slave) configuration'))
			.setDefaultPermission(false)
			.toJSON()
		);
	}

	async afterRegisterCommands(commands) {
		const masterCommand = await this.bot.discord.guilds.cache.get(this.config.ids.guild)?.commands.cache.find(command => command.name === 'master');
		if (masterCommand) {
			let permissions = [{
				id: this.config.ids.master-role,
				type: 'ROLE',
				permission: true
			}]
			await masterCommand.permissions.set({permissions});
		}
		
		const slaveCommand = await this.bot.discord.guilds.cache.get(this.config.ids.guild)?.commands.cache.find(command => command.name === 'slave');
		if (slaveCommand) {
			let permissions = [{
				id: this.config.ids.discord,
				type: 'USER',
				permission: true
			}]
			await slaveCommand.permissions.set({permissions});
		}

		return;
	}

	handleCommandSlave(interaction) {
		if (interaction.member.user.id != this.config.ids.discord) {
			interaction.reply({ content: 'Error processing command',  ephemeral: true });
			return false;
		}

		let command = interaction.options.getSubcommand().toLowerCase();
		switch (command) {
			case 'wake':
				this.handleWake(interaction);
				break;
			case 'reload':
				this.reload();
				interaction.reply({ content: 'Done', ephemeral: true} );
				break;
			default:
				interaction.reply({ content: 'Error processing command',  ephemeral: true });
		}
		return true;
	}
	
	handleCommandMaster(interaction) {
		if (interaction.member.user.id != this.config.ids.discord) {
			interaction.reply({ content: 'Error processing command',  ephemeral: true });
			return false;
		}

		let command = interaction.options.getSubcommand().toLowerCase();
		switch (command) {
			case 'wake':
				this.handleWake(interaction);
				break;
			case 'reload':
				this.reload();
				interaction.reply({ content: 'Done', ephemeral: true} );
				break;
			default:
				interaction.reply({ content: 'Error processing command',  ephemeral: true });
		}
		return true;
	}


	handleCommand(interaction) {
		if (interaction.guild.id !== this.config.ids.guild) { return false; }

		let command = interaction.commandName;
		switch(command) {
			case 'slave':
				return this.handleCommandSlave(interaction);
				break;
			case 'master':
				return this.handleCommandMaster(interaction);
				return true;
			default:
				return false;
		}

	}

	handleWake(interaction) {
		const punishment = this.tasklists.getTask('wake', this.slave.state);
		const taskInstance = new TaskInstance(punishment, this);
		taskInstance.replyInteraction(interaction, 'You woke up?', 'Here is what you will do:');
	}

	messagePrivate(msg) {
		if (this.discord.user) {
			this.discord.user.send(msg);
		}
		if (this.config.ids.telegram) {
			this.bot.telegram.telegram.sendMessage(this.config.ids.telegram, msg, {});
		}
	}	

	messageChannel(msg, embed) {
		let message = {};
		if (msg) { 
			message.content = msg 
		} else { 
			message.content = ' '; 
		}
		if (Array.isArray(embed)) { 
			message.embeds = embed
		} else if (embed) { 
			message.embeds = [embed] 
		}
		message.fetchReply = true;
		return sendChannel(message); 
	}

	sendChannel(contents, channel) {
		if (this.discord.channel) {
			return this.discord.channel.send(contents);
		}
	}
}

module.exports = ChatMaster;
