const Discord = require('discord.js');
const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const orderUtil = require('./orders.js');
const TaskLists = require('./TaskLists.js');
const TaskInstance = require('./TaskInstance.js');
const { SlaveStatus, Status } = require('./Status.js');
const { CommandHandler } = require(path.resolve(__dirname, '..', 'CommandHandler.js'));
const { MultiPageEmbed } = require('./MultiPageEmbed.js');

const slaveJSON = 'slave.json';
const configJSON = 'config.json';

class Master extends CommandHandler {
	constructor(bot, guild) {
		super(bot);
		this.slaves = [];
		this.guild = guild;
		this.guilds = [ this.guild ]
	}

	addSlave(slave) {
		this.slaves.push(slave);
	}

	getCommand_Slave() {
		return new SlashCommandBuilder()
			.setName ('slave')
			.setDescription('Slaves commands')
			.addSubcommand(subcommand => subcommand
				.setName('wake')
				.setDescription('Involuntary wake up'))
			.addSubcommand(subcommand => subcommand
				.setName('reload')
				.setDescription('Reload (slave) configuration'))
			.addSubcommandGroup(subcommand => subcommand
				.setName('request')
				.setDescription('Request something')
				.addSubcommand(subcommand => subcommand
					.setName('permission')
					.setDescription('Request permission for something')
					.addStringOption(option => option
						.setName('for')
						.setDescription('What do you want permission for?')
						.setRequired(true)))
				.addSubcommand(subcommand => subcommand
					.setName('task')
					.setDescription('Request a task from a category')
					.addStringOption(option => option
						.setName('from')
						.setDescription('Task category')
						.setRequired(true))))
			.addSubcommandGroup(subcommand => subcommand
				.setName('status')
				.setDescription('manipulate state')
				.addSubcommand(subcommand => subcommand
					.setName('set')
					.setDescription('Set your status')
					.addStringOption(option => option
						.setName('status')
						.setDescription('What should your new status be?')
						.setRequired(true)))
				.addSubcommand(subcommand => subcommand
					.setName('task')
					.setDescription('Request a task based on your status')))
			.addSubcommand(subcommand => subcommand
				.setName('camjoin')
				.setDescription('Someone joined'))
			.setDefaultPermission(false)
			.toJSON();
	}

	addSlaveCommandUserOption(subcommand) {
	// If there are more than 1 slave in this guild. 
	// Add the 'slave' as required option to the masters commands
		if (this.slaves.length>1) {
			subcommand.addUserOption(option => option
				.setName('slave')
				.setDescription('slave to execute this command for')
				.setRequired(true))
		}
		return subcommand;
	}

	getCommand_Master() {
		return new SlashCommandBuilder()
			.setName ('master')
			.setDescription('Masters commands for the master')
			.addSubcommand(subcommand => this.addSlaveCommandUserOption(subcommand
				.setName('reload')
				.setDescription('Reload (slave) configuration')))
			.addSubcommandGroup(subcommandgroup => subcommandgroup
				.setName('state')
				.setDescription('manipulate state')
				.addSubcommand(subcommand => this.addSlaveCommandUserOption(subcommand
					.setName('get')
					.setDescription('get state')))
				.addSubcommand(subcommand => this.addSlaveCommandUserOption(subcommand
					.setName('set')
					.setDescription('set state')
					.addStringOption(option => option
						.setName('id')
						.setDescription('What setting to change')
						.setRequired(true))
					.addStringOption(option => option
						.setName('value')
						.setDescription('New value for this state')
						.setRequired(true)))))
			.addSubcommand(subcommand => this.addSlaveCommandUserOption(subcommand
				.setName('listtasks')
				.setDescription('Show all tasks for a tasklist, with their current calculated chance')
				.addStringOption(option => option
					.setName('tasklist')
					.setRequired(true)
					.setDescription('name of the tasklist to select a task from'))))
			.addSubcommand(subcommand => this.addSlaveCommandUserOption(subcommand
				.setName('givetask')
				.setDescription('Give slave a task from a tasklist')
				.addStringOption(option => option.setName('tasklist')
					.setRequired(true)
					.setDescription('name of the tasklist to select a task from'))))
			.setDefaultPermission(false)
			.toJSON()
	}

	getCommands(commands) {
		commands.push(this.getCommand_Slave());  // /slave xxx
		commands.push(this.getCommand_Master()); // /master yyy
	}

	async afterRegisterCommands() {
		const guild = await this.bot.discord.guilds.fetch(this.guild);
		const commands = await guild.commands.fetch();
	}

	handleCommand(interaction) {
		// only check for this guild this master is active in
		if (interaction.guild.id != this.guild) return false;
		let command = interaction.commandName;

		if (command =='slave') {
			// Check if the SENDER is a know slave
			let slave = this.slaves.find(slave => slave.config.ids.discord == interaction.user.id);
			if (slave) {
				return slave.handleCommandSlave(interaction);
			} else {
				interaction.reply({content: 'I don\'t know you', ephemeral: true}); 
			}
			return true;
		}
		else if (command ==  'master') {
			const {options} = interaction;
		
			let slaveUserId = 0;
			let slave = null;

			// Pick the only slave, or look for the entered slave
			if (this.slaves.length==1) {
				slave = this.slaves[0];
			} else if (this.slaves.length>1) {
				slaveUserId = options.get('slave').value;
				slave = this.slaves.find(slave => slave.config.ids.discord == slaveUserId);
			}

			// no such slave
			if (!slave) {
				interaction.reply({content: 'This slave is unknown to me. ' + (slaveUserId!=0?'('+options.get('slave').username+')':''), ephemeral: true}); 
				return true;
			}

			return slave.handleCommandMaster(interaction);
		} else 
			return false;
	}


	sendChannel(contents, channel) {
		// Send a message to channel
		if (this.discord.channel) {
			return this.discord.channel.send(contents);
		}
	}
}

module.exports = { Master } ;
