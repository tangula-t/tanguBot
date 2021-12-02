const Discord = require('discord.js');
const fs = require('fs');
const path = require('path');
const { Slave } = require('./Slave.js');
const { Master } = require('./Master.js');
const slaveJSON = 'slave.json';
const configJSON = 'config.json';

class MasterFactory {
	constructor(bot) {
		this.bot = bot;
		this.masters = [];
	}
		
	loadSlaves(dir) {
		const slaveDirs = fs.readdirSync(dir+'/', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);

		for (const slaveDir of slaveDirs ) {
			if (slaveDir == 'empty_slave') continue;
			let slave = new Slave(this.bot, path.resolve(dir, slaveDir));
			let master = this.masters.find(m => m.guild == slave.guild);
			if (!master) {
				master = new Master(this.bot, slave.guild);
				this.masters.push(master);
			}
			master.addSlave(slave);
		}
	}
}

module.exports = MasterFactory;
