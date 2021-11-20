const { Collection, Client, Intents } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Telegraf } = require('telegraf');
const path = require('path');
const fs = require('fs');

const ChatMaster = require('./master/ChatMaster.js');

class TanguBot {
	constructor() {
		this.dirname = __dirname;
		this.commands = new Collection();
		this.commandHandlers = [];

		this.initConfig();
		this.initDiscord();
		this.initTelegram();
	}

	initConfig() {
		const data = fs.readFileSync(path.resolve('config.json'));
		this.config = JSON.parse(data);
	}

	initDiscord() {
		this.discord = new Client({disableEveryone: true, intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS ] });
		this.discord.on('ready', this.discordReadyHandler.bind(this)); 
		//this.client.on('messageDelete', async message => {
		this.discord.on('interactionCreate', this.discordInteractionCreateCommandHandler.bind(this));
		this.discord.on('messageCreate', this.discordMessageCreateHandler.bind(this)); 
		this.discord.login(this.config.discord.token);
		this.rest = new REST({version: '9'}).setToken(this.config.discord.token);
	}

	async discordInteractionCreateCommandHandler(interaction)  {
		if (!interaction.isCommand()) { return; }
		for (let commandHandler of this.commandHandlers) {
			if (commandHandler.handleCommand(interaction)) {
				return;
			}
		}
	}

	discordReadyHandler(e) {
		console.log('Logged in as ' + this.discord.user.tag);
		this.discord.user.setActivity('with my subs', { type: 'PLAYING' })
		this.loadCommands('commands');
		this.loadChatMasters('slaves');
		this.registerCommands();
	}

	async discordMessageCreateHandler(message) {
  		if(message.author.bot) return; // Ignore other bots and self
		if(message.type !== 'DEFAULT') return; 
		// Check for our prefix
		if(message.content.indexOf(this.config.prefix) !== 0) return;

		// command = command -- args - ['these', 'are', 'arguments']
  		const args = message.content.slice(this.config.prefix.length).trim().split(/ +/g);
		const command = args.shift().toLowerCase();
	
		switch(command) {
			case 'ping': // Default bot test example
      				const m = await message.channel.send("Ping?");
				m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
				break;
    			default:
				let cmd = '';
				if (this.commands.has(command)) 	
					cmd = this.commands.get(command)

				if (cmd) {
					if (!cmd.meta.role || cmd.meta.role==='' || hasRole(message.member, cmd.meta.role)) {
						cmd.handleTextCommand(message, args);
					}
				}	
		  }
	}

	initTelegram() {
		this.telegram = new Telegraf(this.config.telegram.token);
		this.telegram.command('start', ctx => {
			console.log(ctx);
		});
		this.telegram.launch();
	}

	loadChatMasters(dir) {
		const slaves = fs.readdirSync(dir+'/', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);

		for (const slave of slaves ) {
			if (slave == 'empty_slave') continue;
			this.commandHandlers.push(new ChatMaster(this, path.resolve(dir, slave)));
		}
	}

	loadCommands(dir) {
		const commandFiles = fs.readdirSync(dir+'/').filter(files => files.endsWith(".js"));

		for (const file of commandFiles) {
			if (file == 'example.js') continue;

			const CommandClass = require(path.resolve(dir, file));
			const command = new CommandClass(this);
			this.commandHandlers.push(command);
	
			// Old style '!' command loading:
			const meta = command.meta();
			if (meta && typeof(meta.name)==='string') {
				if (this.commands.get(meta.name))  
					return console.warn(`Two or more commands have the same name: ${meta.name}.`);
  				this.commands.set(meta.name, command);
	
				console.log('Loaded command: ' + meta.name);
			}
	
		}
	}

	registerCommands() {
		this.discord.guilds.cache.forEach(guild => {
			let guildCommands = [];
		
			this.commandHandlers.forEach(handler => handler.getGuildCommands(guild.id, guildCommands));

			this.rest.put(
				Routes.applicationGuildCommands(this.config.discord.clientId, guild.id),
				{ body: guildCommands }
			)
			.then(() => { console.log ('Registered commands for guild: ' + guild.name + ". Registered: " + guildCommands.map(c => c.name)); })
			.catch(e => { console.log(e); }	);
		});
		this.commandHandlers.forEach(handler => handler.afterRegisterCommands());
	}
}

function hasRole(member, role) {
	return member.guild.roles.cache.find(r => r.name === role);
}

module.exports = { TanguBot } ;
