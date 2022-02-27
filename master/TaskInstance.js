const orderUtil = require('./orders.js');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CANCEL_BUTTON_ID = 'cancel_button_default_item';

class TaskInstance {
	constructor(task, master) {
		this.taskStr = task.taskStr(); // Parse once!
		this.task = task;
		this.bot = master.bot;
		this.master = master;
	}

	getTaskEmbed(title, message) {
		let description = this.task.taskStr();
		let embedTitle = title?title:this.task.title;
		let embedMessage = message?message:' ';
		let embed = new MessageEmbed()
			.setAuthor(this.master.config.name)
			.setTitle(embedTitle)
			.setDescription(embedMessage)
			.setColor(0x900090)
			.setFooter('status ' + this.master.slave.state.merit);
		
		if (!this.task.isEmpty())  {
			embed.addField('Order', this.taskStr);
		} else {
			embed.addField('No order', 'No task was given.');
		}
		return embed;
	}

	getButtons () {
		let result = new MessageActionRow();
 		if (this.task.replies !== undefined) {
			const tasks = Object.keys(this.task.replies);

			if (tasks.length > 0) {
			
				for (let task of tasks) {
					result.addComponents(
						new MessageButton()
							.setCustomId(task)
							.setLabel(task)
							.setStyle('PRIMARY'),
					);
				}
				
			}
		}	
		result.addComponents(
			new MessageButton()
				.setCustomId(CANCEL_BUTTON_ID)
				.setLabel('Cancel')
				.setStyle('DANGER')
		);
				
		return [result];
	}

	getMessage(title, message) {
		let result = { content: ' ' };
		result.embeds = [this.getTaskEmbed(title, message)];
			
		let components = this.getButtons();
		if (components !== undefined) {
			result.components = components
		}
		return result;
	}

	disableAllButtons(message) {
		let rows = message.components;
		for (let i=0; i<rows.length; i++) {
			for(let j=0; j<rows[i].components.length; j++) {
				rows[i].components[j].setDisabled(true);
			}
		}
		message.edit({components: rows});
	}

	notify () {
		this.master.messagePrivate('Warning: New task: ' + this.taskStr);
	}

	handleReplyCancel(interaction) {
		if (interaction.member.roles.cache.has(this.master.config.ids.masterrole)) {
			interaction.reply({content: 'Action was cancelled by ' + interaction.member.displayName})
		} else {
			interaction.reply({content: '<@&'+this.master.config.ids.masterrole+'>! Action was cancelled by ' + interaction.member.displayName})
		}
		this.disableAllButtons(interaction.message);
	}

	handleReplyButton(interaction) {
		let reply = this.task.replies[interaction.customId];
		this.master.applyState(reply.status);
		
		if (reply.hasReply) {
			interaction.reply({content: reply.reply})
		} else {
			const task = reply.getTask(master);
			if (task) {
				const taskInstance = new TaskInstance(task, this.master);
				taskInstance.replyInteraction(interaction, "You chose: " + interaction.customId, 'Here is a solution for you!');
			}
		}
		this.disableAllButtons(interaction.message);
	}

	handleReply(interaction) {
		if (interaction.customId == CANCEL_BUTTON_ID) {
			this.handleReplyCancel(interaction);
		} 
		else if (interaction.customId in this.task.replies) {
			this.handleReplyButton(interaction);
		} 
		else {
			interaction.reply({content: 'Illegal action', ephemeral: true});
		}
	}

	awaitMessageComponent(message) {
		const filter = i => {
			if (i.user.id === this.master.config.ids.discord) 
				return true;

			if ((i.customID == CANCEL_BUTTON_ID) && i.member.roles.cache.has(this.master.config.ids.masterrole))
				return true;

			i.reply({content: 'This interaction was not meant for you', ephemeral: true});
		};
		
		let timeout = this.bot.config.defaultTimeout;
		if (this.task.timeout) { 
			timeout = this.task.timeout.time; 
		}

		message.awaitMessageComponent({ filter, componentType: 'BUTTON', time: timeout })
			.then(i => {
				this.handleReply(i)
			})
			.catch(err => {
				this.disableAllButtons(message);
				if (this.task.timeout) {
					console.log("Reply timeout.");
					this.master.applyState(this.task.timeout.status);
					if (this.task.timeout.hasReply) {
						message.channel.send(this.task.timeout.reply)
					} else if (this.task.timeout.hasTasks) {
						const task = this.task.timeout.getTask(this.master);
						if (!task.isEmpty()) {
							const taskInstance = new TaskInstance(task, this.master);
							taskInstance.sendTask(message.channel, "You are too late!", "Here is what will happen.");
							this.master.messagePrivate('New Task!');
						}
					}
				} else {
	 				console.log(`Error processing reply` + err);
				}
			});
	}

	async sendTask(target, title, message) {
		this.userID = this.master.config.ids.discord;
		
		let contents = this.getMessage(title, message);
		contents.fetchReply = true;
		let DCMessage = await target.send(contents);

		this.awaitMessageComponent(DCMessage);
	}

	async replyInteraction(interaction, title, message) {
		this.userID = interaction.user.id;

		let contents = this.getMessage(title, message);
		contents.fetchReply = true;
		let DCMessage = await interaction.reply(contents);

		this.awaitMessageComponent(DCMessage);
	}
}

module.exports = TaskInstance;
