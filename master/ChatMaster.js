const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const orderUtil = require('./orders.js');
const TaskLists = require('./TaskLists.js');
const TaskInstance = require('./TaskInstance.js');
const { SlaveStatus, Status } = require('./Status.js');
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
		this.config = this.loadFile(configJSON);
		this.status = new SlaveStatus(this.slavePath);
		this.permissions = this.loadFile('permissions.json');
		this.tasklists = new TaskLists(this.slavePath);

		this.guilds = [ this.config.ids.guild ]; 

		this.reload()
			.then(()=>{
				console.log('master loaded for ' + this.config.name);
			});
	}

	async reload() {
		await this.reloadSlave()
			.then(()=>{this.tasklists.reload()})
			.then(()=>{console.log("Reloaded: " + this.config.name)});
	}

	loadFile(file) {
		let data = fs.readFileSync(path.resolve(this.slavePath, file));
		return JSON.parse(data);
	}

	async reloadSlave() {
		this.slave = this.loadFile(slaveJSON)

		this.discord.channel = await this.bot.discord.channels.cache.get(this.config.ids.discordchannel);
		if (!this.discord.channel) {
			console.log('ERROR: Channel not found: ' + this.config.ids.discordchannel);
		}
	
		this.discord.user = await this.bot.discord.users.fetch(this.config.ids.discord, []); 
		if (!this.discord.user) {
			console.log('ERROR: User not found: ' + this.config.ids.discord);
		}

		this.status.activeStatus = this.slave.status;
	}

	async saveSlave() {
		let data = JSON.stringify(this.slave, null, 2);
		fs.writeFileSync(path.resolve(this.slavePath, slaveJSON), data);
	}

	applyState(stateChange) {
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

	setState(newState) {
		if (!newState) { return; }

		for (let state in newState) 
			this.slave.state[state] = newState[state];
		this.saveSlave();
	}

	handleSlaveSetStatus(interaction) {
		const {options} = interaction;
		let newStatus = options.get('status').value;

		if (this.status.setStatus(this, newStatus)) {
			interaction.reply({content: 'new status: ' + this.status.getStatus().description, ephemeral: true});
		} else {
			interaction.reply({content: 'unknown status: ' + newStatus, ephemeral: true});
			return;
		}

		this.slave.status = newStatus;
		this.saveSlave();
	}

	handleSlaveStatus(interaction) {
		const {options} = interaction;

		let command = interaction.options.getSubcommand().toLowerCase();

		switch(command) {
			case 'set': 
				this.handleSlaveSetStatus(interaction);
				break;
			case 'task':
				let s = this.status.getStatus()
				if (s.hasTask) {
					const task = s.getTask(this);
					const taskInstance = new TaskInstance(task, this);
					taskInstance.replyInteraction(interaction, 'You asked for a task', 'Your current status is: ' + this.slave.status);
				} else {
					interaction.reply({ content: 'There are no tasks associated with your status: ' + this.slave.status, ephemeral: true});
				}
				break;
		}

	}

	getPermissionsStringOption(option) {
		option.setName('for')
			.setDescription('What do you want permission for?')
			.setRequired(true);
			
		for (let permission in this.permissions) {
			option.addChoice(permission, permission);
		}
		return option;
	}

	handlePermission(interaction) {
		const {options} = interaction;
		let permissionFor = options.get('for').value;
		if (permissionFor in this.permissions) {
			let permission = this.permissions[permissionFor];
			if (permission.status) {
				this.applyState(permission.status);
			}
			const task = this.tasklists.getTask(permission.tasks, this.slave.state);
			const taskInstance = new TaskInstance(task, this);
			taskInstance.replyInteraction(interaction, 'You asked permission for: ' + permissionFor, 'This is my answer');
		}
		else {
			interaction.reply({ content: 'No permission list found for: ' + permissionFor, ephemeral: true});
		}

	}

	handleMasterState(interaction) {
		const {options} = interaction;

		let command = interaction.options.getSubcommand().toLowerCase();

		switch(command) {
			case 'get': 
				let r = new Discord.MessageEmbed()
					.setTitle(this.config.name + ' state.')
					.setDescription('All state fields listed below' );

				for (let s in this.slave.state) {
					r.addField(s, '' + this.slave.state[s]);

				}
				interaction.reply({ content: ' ', embeds: [r], ephemeral: true});
				break;
			case 'set': 
				const id = options.get('id').value;
				const value = options.get('value').value;

				if (id in this.slave.state) {
					const old = this.slave.state[id];
					if (Number.isInteger(old)) {
						try {
							var newNumber = +value;
						} catch(e) {
							interaction.reply({content: 'Refusing to set a non-number value to a currently numeric value', emphemeral: true});
							return;
						}
						if (!Number.isInteger(newNumber)) {
							interaction.reply({content: 'Refusing to set a non-number value to a currently numeric value', emphemeral: true});
							return;
						} else {
							this.slave.state[id] = newNumber;
						}
					} else if (typeof old == 'boolean') {
						if (value == 'true' || value == '1') {
							this.slave.state[id] = true
						} else if (value == 'false' || value == '0') {
							this.slave.state[id] = false
						} else {
							interaction.reply({content: 'Cannot parse "'+value+'" to boolean. (true or false)', emphemeral: true});
							return;
						}
					} else {
							this.slave.state[id] = value;
					}
					this.saveSlave();
					interaction.reply({content: '' + id + ' set to ' + this.slave.state[id], ephemeral: true});
				} else {
					interaction.reply({content: 'Unknown state ID: ' + id, emphemeral: true});
				}
		}

	}
	
	getCommands(commands) {
		commands.push(
			new SlashCommandBuilder()
			.setName ('slave')
			.setDescription('Slaves commands')
			.addSubcommand(subcommand => subcommand
				.setName('wake')
				.setDescription('Involuntary wake up'))
			.addSubcommand(subcommand => subcommand
				.setName('reload')
				.setDescription('Reload (slave) configuration'))
			.addSubcommand(subcommand => subcommand
				.setName('permission')
				.setDescription('Ask permission for something')
				.addStringOption(option => this.getPermissionsStringOption(option))
			)
			.addSubcommandGroup(subcommand => subcommand
				.setName('status')
				.setDescription('manipulate state')
				.addSubcommand(subcommand => subcommand
					.setName('set')
					.setDescription('Set your status')
					.addStringOption(option => this.status.getStatusStringOption(option))
				)
				.addSubcommand(subcommand => subcommand
					.setName('task')
					.setDescription('Request a task based on your status' )	
				)
			)
			.addSubcommand(subcommand => subcommand
				.setName('camjoin')
				.setDescription('Someone joined'))
			.setDefaultPermission(false)
			.toJSON()
		);
		
		commands.push(
			new SlashCommandBuilder()
			.setName ('master')
			.setDescription('Masters commands for the master')
			.addSubcommand(subcommand => subcommand
				.setName('reload')
				.setDescription('Reload (slave) configuration'))
			.addSubcommandGroup(subcommand => subcommand
				.setName('state')
				.setDescription('manipulate state')
				.addSubcommand(subcommand => subcommand
					.setName('get')
					.setDescription('get state')
				)
				.addSubcommand(subcommand => subcommand
					.setName('set')
					.setDescription('set state')
					.addStringOption(option => option
						.setName('id')
						.setDescription('What setting to change')
						.setRequired(true))
					.addStringOption(option => option
						.setName('value')
						.setDescription('New value for this state')
						.setRequired(true))
				)
			)
			.addSubcommand(subcommand => subcommand
				.setName('listtasks')
				.setDescription('Show all tasks for a tasklist, with their current calculated chance')
				.addStringOption(option => option.setName('tasklist')
							.setRequired(true)
							.setDescription('name of the tasklist to select a task from'))
			)
			.addSubcommand(subcommand => subcommand
				.setName('givetask')
				.setDescription('Give '+this.config.name+' a task from a tasklist')
				.addStringOption(option => option.setName('tasklist')
							.setRequired(true)
							.setDescription('name of the tasklist to select a task from'))
			)
			.setDefaultPermission(false)
			.toJSON()
		);
	}

	async afterRegisterCommands() {
		const guild = await this.bot.discord.guilds.fetch(this.config.ids.guild);
		const commands = await guild.commands.fetch();

		commands.forEach(command => {
			if (command.name == 'master') {
				let permissions = [{
					id: this.config.ids.masterrole,
					type: 'ROLE',
					permission: true
				}]
				command.permissions.set({permissions});
				console.log('set permissions for master');
			} else if (command.name == 'slave') {
				let permissions = [{
					id: this.config.ids.discord,
					type: 'USER',
					permission: true
				}]
				command.permissions.set({permissions});
			}
		});
	}

	handleCommandSlave(interaction) {
		let commandgroup = interaction.options.getSubcommandGroup(false)
		if (commandgroup) {
			commandgroup = commandgroup.toLowerCase();
			switch (commandgroup) {
				case 'status': 
					this.handleSlaveStatus(interaction);
					return true;
					break;
			}
		}	
		let command = interaction.options.getSubcommand().toLowerCase();
		switch (command) {
			case 'wake':
				this.handleWake(interaction);
				break;
			case 'camjoin':
				this.handleCamJoin(interaction);
				break;
			case 'permission':
				this.handlePermission(interaction);
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
		let commandgroup = interaction.options.getSubcommandGroup(false)
		if (commandgroup) {
			commandgroup = commandgroup.toLowerCase();
			switch (commandgroup) {
				case 'state': 
					this.handleMasterState(interaction);
					return true;
					break;
			}
		}	
		let command = interaction.options.getSubcommand().toLowerCase();
		switch (command) {
			case 'listtasks':
				this.handleMasterListTasks(interaction);
				break;
			case 'givetask':
				this.handleMasterGiveTask(interaction);
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
	
	handleCamJoin(interaction) {
		const punishment = this.tasklists.getTask('oncam', this.slave.state);
		const taskInstance = new TaskInstance(punishment, this);
		interaction.reply({content: 'ok', ephemeral: true});
		taskInstance.sendTask(this.discord.channel, 'Someone joined', 'This is the task that was picked');
	}

	handleMasterGiveTask(interaction) {
		const {options} = interaction;
		let taskList = options.get('tasklist').value;
		const task = this.tasklists.getTask(taskList, this.slave.state);
		const taskInstance = new TaskInstance(task, this);
		taskInstance.replyInteraction(interaction, interaction.member.displayName + ' requested a task for ' + this.config.name, ' ');
		this.messagePrivate('New task from ' + interaction.member.displayName +'!');
	}
	
	handleMasterListTasks(interaction) {
		const {options} = interaction;
		let taskList = options.get('tasklist').value;
		const overview = this.tasklists.getOverview(taskList, this.slave.state);
		const embed = new Discord.MessageEmbed()	
				.setTitle('Tasks in list: ' + taskList)
				.setDescription('' + overview);
		interaction.reply({content: ' ', embeds: [embed], ephemeral: true});
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
