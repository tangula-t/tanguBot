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
const { MultiPageEmbed } = require('./MultiPageEmbed.js');

const slaveJSON = 'slave.json';
const configJSON = 'config.json';

class Slave {
	constructor(bot, slavePath) {
		this.bot = bot;
		this.slavePath = slavePath;
		this.slave = {};
		this.config = {};
		this.discord = {};
		this.config = this.loadFile(configJSON);
		this.status = new SlaveStatus(this, this.slavePath);
		this.tasklists = new TaskLists(this.slavePath);

		this.guild = this.config.ids.guild; 

		this.reload()
			.then(()=>{
				console.log('Slave instance created: ' + this.config.name);
			})
			.catch((error)=>{ console.log('Could not load slave' + this.config.name + "\n" + error)});
	}

	async reload() {
		await this.reloadSlave()
			.then(()=>{this.tasklists.reload()})
			.then(()=>{console.log("Reloaded tasks & status for: " + this.config.name)});
	}

	loadFile(file) {
		var filename = path.resolve(this.slavePath, file);
		let data = '{}';
		if (fs.existsSync(filename)) {
  		  data = fs.readFileSync(filename);
		} else {
		  console.log(`Skipping reading of ${filename}. File does not exist`);
		}
		  
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
		this.status.load(this, this.slave.status);
		
		this.permissions = this.loadFile('permissions.json');
		this.requests = this.loadFile('requests.json');
	}

	async saveSlave() {
		let data = JSON.stringify(this.slave, null, 2);
		fs.writeFileSync(path.resolve(this.slavePath, slaveJSON), data);
	}

	
	applyState(stateChange) {
		if (!stateChange) { return; }

		// Apply state -> numeric values are added
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
		// Set state -> override values

		for (let state in newState) 
			this.slave.state[state] = newState[state];
		this.saveSlave();
	}

	handleCommandStatus_Set(interaction) {
		const {options} = interaction;
		let newStatus = options.get('status').value;

		if (this.status.setStatus(this, newStatus)) {
			interaction.reply({content: 'new status: ' + this.status.getStatus().description, ephemeral: true});
		} else {
			interaction.reply({content: 'unknown status: ' + newStatus + "\n\nValid options are: " + this.status.getValidStatusString(), ephemeral: true});
			return;
		}

		this.slave.status = newStatus;
		this.saveSlave();
	}

	handleCommandStatus_Task(interaction) {
		let status = this.status.getStatus()
		if (status.hasTask) {
			const task = status.getTask(this);
			const taskInstance = new TaskInstance(task, this);
			taskInstance.replyInteraction(interaction, 'You asked for a task', 'Your current status is: ' + this.slave.status);
		} else {
			interaction.reply({ content: 'There are no tasks associated with your status: ' + this.slave.status, ephemeral: true});
		}
	}

	handleCommandStatus(interaction) {
		const {options} = interaction;

		let command = interaction.options.getSubcommand().toLowerCase();

		switch(command) {
			case 'set': 
				this.handleCommandStatus_Set(interaction);
				break;
			case 'task':
				this.handleCommandStatus_Task(interaction);
				break;
		}

	}
	
	handleCommandRequest(interaction) {
		const {options} = interaction;

		let command = interaction.options.getSubcommand().toLowerCase();

		switch(command) {
			case 'permission':
				this.handleCommandPermission(interaction);
				break;
			case 'task':
				this.handleCommandRequestTask(interaction);
				break;
		}

	}

	getPermissionsStringOption(option) {
		for (let permission in this.permissions) {
			option.addChoice(permission, permission);
		}
		return option;
	}

	handleCommandPermission(interaction) {
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
			let validPermissions = Object.keys(this.permissions).sort().join(', ');
			interaction.reply({ content: 'I dont know how to give you permission for: ' + permissionFor + "\n\nValid options are: " + validPermissions, ephemeral: true});
		}

	}

	handleCommandReload(interaction) {	
		this.reload()
			.then(() => interaction.reply({ content: 'Done', ephemeral: true} ))
			.catch(() => {
				interaction.reply({ content: 'Reload failed!', ephemeral: true} );
				this.messagePrivate('RELOAD FAILED');
			});
	}
	
	handleCommandRequestTask(interaction) {
		const {options} = interaction;
		let requestFrom = options.get('from').value;
		if (requestFrom in this.requests) {
			let request = this.requests[requestFrom];
			if (request.status) {
				this.applyState(request.status);
			}
			const task = this.tasklists.getTask(request.tasks, this.slave.state);
			const taskInstance = new TaskInstance(task, this);
			taskInstance.replyInteraction(interaction, 'You requested a task from: ' + requestFrom, 'Here you go');
		}
		else {
			let validRequests = Object.keys(this.request).sort().join(', ');
			interaction.reply({ content: 'Unknown request list: ' + requestFrom + "\n\nValid options are: " + validRequests, ephemeral: true});
		}

	}

	handleCommandSlave(interaction) {
		let commandgroup = interaction.options.getSubcommandGroup(false)
		if (commandgroup) {
			commandgroup = commandgroup.toLowerCase();
			switch (commandgroup) {
				case 'status': 
					this.handleCommandStatus(interaction);
					return true;
					break;
				case 'request': 
					this.handleCommandRequest(interaction);
					return true;
					break;
			}
		}	

		let command = interaction.options.getSubcommand().toLowerCase();
		switch (command) {
			case 'wake':
				this.handleCommandWake(interaction);
				break;
			case 'camjoin':
				this.handleCommandCamJoin(interaction);
				break;
			case 'reload':
				this.handleCommandReload(interaction);
				break;
			default:
				interaction.reply({ content: 'Error processing command',  ephemeral: true });
		}
		return true;
	}
	
	handleCommandWake(interaction) {
		const punishment = this.tasklists.getTask('wake', this.slave.state);
		const taskInstance = new TaskInstance(punishment, this);
		taskInstance.replyInteraction(interaction, 'You woke up?', 'Here is what you will do:');
	}
	
	handleCommandCamJoin(interaction) {
		const punishment = this.tasklists.getTask('oncam', this.slave.state);
		const taskInstance = new TaskInstance(punishment, this);
		interaction.reply({content: 'ok', ephemeral: true});
		taskInstance.sendTask(this.discord.channel, 'Someone joined', 'This is the task that was picked');
	}
	
	handleCommandMaster(interaction) {
		if (!(interaction.member.roles.cache.has(this.config.ids.masterrole))) {
			interaction.reply({content: 'this is not your slave to control', ephemeral: true});
			return true;
		}

		let commandgroup = interaction.options.getSubcommandGroup(false)
		if (commandgroup) {
			commandgroup = commandgroup.toLowerCase();
			switch (commandgroup) {
				case 'state': 
					this.handleMasterCommandState(interaction);
					return true;
					break;
			}
		}

		let command = interaction.options.getSubcommand().toLowerCase();
		switch (command) {
			case 'listtasks':
				this.handleMasterCommandListTasks(interaction);
				break;
			case 'givetask':
				this.handleMasterCommandGiveTask(interaction);
				break;
			case 'reload':
				this.handleCommandReload(interaction);
				break;
			default:
				interaction.reply({ content: 'Error processing command',  ephemeral: true });
		}
		return true;
	}
	
	handleMasterCommandState(interaction) {
		let command = interaction.options.getSubcommand().toLowerCase();

		switch(command) {
			case 'get':
				this.handleMasterCommandState_Get(interaction);
				break;
			case 'set': 
				this.handleMasterCommandState_Set(interaction);
				break;
		}
	}
	
	handleMasterCommandState_Get(interaction) {
		let multiPageEmbed = new MultiPageEmbed({
				title: this.config.name + ' state.',
				description: 'All state fields for '+this.config.name+' are listed below',
				ephemeral: true,
				sort: true,
				author: interaction.member.displayName},
				this.slave.state,
				interaction.user.id);
		multiPageEmbed.interactionReply(interaction);
	}
	
	handleMasterCommandState_Set(interaction) {
		const {options} = interaction;

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
			interaction.reply({content: '' + id + ' set to ' + this.slave.state[id] + ' for ' + this.config.name, ephemeral: true});
		} else {
			interaction.reply({content: 'Unknown state ID: ' + id, emphemeral: true});
		}
	}

	handleMasterCommandGiveTask(interaction) {
		const {options} = interaction;
		let taskList = options.get('tasklist').value;
		const task = this.tasklists.getTask(taskList, this.slave.state);
		if (task.isEmpty()) {
			interaction.reply({content: 'An empty task was returned. Skipping notification.', emphemeral: true});
		} else {
			const taskInstance = new TaskInstance(task, this);
			taskInstance.replyInteraction(interaction, interaction.member.displayName + ' requested a task for ' + this.config.name, ' ');
			this.messagePrivate('New task from ' + interaction.member.displayName +'!');
		}
	}
	
	handleMasterCommandListTasks(interaction) {
		const {options} = interaction;
		let taskList = options.get('tasklist').value;
		const overview = this.tasklists.getOverview(taskList, this.slave.state);
		const embed = new Discord.MessageEmbed()	
				.setTitle('Tasks in list: ' + taskList)
				.setFooter({text: '**Slave:** ' +  this.config.name})
				.setAuthor({name: interaction.member.displayName})
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

module.exports = { Slave };
