class CommandHandler {
	constructor(bot) {
		this.bot = bot;
		this.guilds = [];
	}

	getGuildCommands(guild, commands) {
		if (this.guilds.length==0) { 
			this.getCommands(commands); 
		} else {
			this.guilds.forEach(_guild => {
				if (_guild == guild) {
					this.getCommands(commands);
				}
			});
		}
	}

	getCommands(commands) {
		return;
	}
	
	handleCommand (interaction) {
		return false;
	}
}

module.exports = { CommandHandler }
