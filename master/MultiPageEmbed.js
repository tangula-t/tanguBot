const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CANCEL_BUTTON_ID = 'cancel_button_default_item';

const backId = 'mpe_back'
const forwardId = 'mpe_forward'
const backButton = new MessageButton({
	  style: 'SECONDARY',
	  label: 'Back',
	  emoji: '⬅️',
	  customId: backId
})
const forwardButton = new MessageButton({
	  style: 'SECONDARY',
	  label: 'Forward',
	  emoji: '➡️',
	  customId: forwardId
})
const maxFields = 5;

class MultiPageEmbed {
	constructor(embed, fields, user) {
		this.embeddata = embed;
		this.fields = fields;
		this.fieldnames = Object.keys(fields);
		if (embed.sort) this.fieldnames = this.fieldnames.sort();
		this.user = user;
		this.index = 0;
		this.message = null;
	}

	messageContents() {
		let buttons = [];
		if (this.fieldnames.length>maxFields)
			buttons = [backButton, forwardButton];

		let result = { 
			content: ' ',
			embeds: [ this.GenerateEmbed() ],
			fetchReply: true,
			ephemeral: this.embeddata.ephemeral?true:false,
			components: buttons.length>0?[new MessageActionRow({components: buttons})]:[]
		}
	
		if (this.fieldnames.length>maxFields) {
			result.components[0].components[0].setDisabled(this.index<=0);
			result.components[0].components[1].setDisabled((this.index+maxFields)>=this.fieldnames.length);
		}

		return result;
	}

	async interactionReply(interaction) {
		let message = await interaction.reply(this.messageContents());
		this.registerReplyHandler(message);
	}

	async targetSend(target) {
		let message = await target.send(this.messageContents());
		this.message = message;
		this.registerReplyHandler(message);
	}

	GenerateEmbed() {
		let embed = new MessageEmbed()
			.setTitle(this.embeddata.title)
			.setDescription(this.embeddata.description);

		if (this.fieldnames.length>maxFields)
			embed.setFooter('Showing: ' + this.index + '-' + (this.index+maxFields) + ' of ' + this.fieldnames.length)

		if (this.embeddata.color)
			embed.setColor(this.embeddata.color)
		if (this.embeddata.author)
			embed.setAuthor(this.embeddata.author)
		const current = this.fieldnames.slice(this.index, this.index + maxFields);
		for (let key of current ) {
			let v = ''+this.fields[key];
			embed.addField(key, v?v:'*empty*');
		}

		return embed;
	}

	awaitMessageComponent(message) {
		const filter = i => {
			if (i.user.id === this.user) return true;
			i.reply({content: 'This interaction was not meant for you', ephemeral: true});
		};
		
		message.awaitMessageComponent({ filter, componentType: 'BUTTON', time: 600000 })
			.then(i => {
				this.handleReply(i)
			})
	}

	registerReplyHandler(message) {
		this.collector = message.createMessageComponentCollector({
			filter: ({user}) => user.id === this.user,
			componentType: 'BUTTON', 
			time: 30000
		})

		this.collector.on('collect', async interaction => {
			this.handleReply(interaction);
  		})
	}

	handleReply(i) {
		console.log(i);
		if (i.customId == forwardId) this.index += maxFields;
		if (i.customId == backId) this.index -= maxFields;

		i.update(this.messageContents());
	}
}
module.exports = { MultiPageEmbed }
