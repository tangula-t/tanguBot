const Discord = require('discord.js');
const Roll = require('roll');
const { SlashCommandBuilder } = require('@discordjs/builders');

const { CommandHandler } = require(path.resolve(__dirname, '..', 'CommandHandler.js'));

class CommandRoll extends CommandHandler {
	getCommands(commands) {
		commands.push(
			new SlashCommandBuilder()
			.setName ('roll')
			.setDescription('Roll the dice')
			.addStringOption(option => option
				.setName('dice')
				.setDescription('dice defintion (ie. 1d6)')
				.setRequired(true)
			)	
			.toJSON()
		)
	}
	
	handleCommand(interaction) {
		const { options } = interaction;
		
		let command = interaction.commandName;
		if (command!='roll') return false;
		
		let rollarg = options.get('dice').value;
                try {
			const roll = new Roll();
			let rollResult = roll.roll(rollarg).rolled;
			
			let embed = new Discord.MessageEmbed()
				.setTitle ('Roll ' + rollarg)
				.setColor(0x4EE2EC);
			if (rollResult.length > 1) {
				embed.setDescription(interaction.member.displayName + ' rolled: [' + rollResult.join(', ') + ']');
			} else {
				embed.setDescription(interaction.member.displayName + ' rolled: ' + rollResult);
			}
                        interaction.reply({content: ' ', embeds: [embed]})

		} catch(error) {
			console.log('Something went wrong in /roll ' + rollarg);
			console.log(error);
                        interaction.reply('ERROR: Invalid input for !roll: '+rollarg);
		}
			return true;
	}
}

module.exports = CommandRoll;
