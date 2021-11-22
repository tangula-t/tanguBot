const fs = require('fs');
const path = require('path');
const { TaskList, Task } = require('./Tasks.js');

const statusesFile = 'statuses.json';

class SlaveStatus {
	constructor(slavePath, activeStatus) {
		this.slavePath = slavePath;
		this.activeStatus = 'unknown'
		this.load('unknown');
	}

	load(activeStatus) {
		this.activeStatus = activeStatus;
		let data = fs.readFileSync(path.resolve(this.slavePath, statusesFile));
		const jsonStatuses = JSON.parse(data);
		
		this.statuses = {};
		for (let s in jsonStatuses) {
			this.statuses[s] = new Status(jsonStatuses[s]);
		}
	}

	statusExists(status) {
		return this.statuses.some(s => s == status);
	}

	getStatusStringOption(option) {
		option.setName('status')
			.setDescription('What should your new status be?')
			.setRequired(true);
			
		for (let s in this.statuses)
			option.addChoice(s, s);
		
		return option;
	}

	setStatus(master, newStatus) {
		if (!(newStatus in this.statuses)) return false;

		let oldStatus = this.activeStatus;
		this.activeStatus = newStatus;
		let status = this.getStatus();
		status.initOnChange(master, oldStatus);	

		return true;
	}

	getStatus() {
		if (this.activeStatus in this.statuses) {
			return this.statuses[this.activeStatus]
		} else { 
			return new Status({description: "unknown"});
		}
	}
}

class Status {
	constructor(statusJson) {
		this.parse(statusJson);
	}

	parse(statusJson) {
		this.description = statusJson.description;
		this.hasTask = false;
		this.setState = false;
		
		this.setStateAfter = [];
		this.ignoreStateAfter = [];

		if (statusJson.tasklist) {
			this.tasklistname = statusJson.tasklist;
			this.hasTask = true;
		}
		if (statusJson.forcestate) {
			this.forcestate = statusJson.forcestate;
			this.setState = true;
		}
		if (statusJson.setStateAfter) {
			this.setStateAfter = statusJson.setStateAfter;
		}
		if (statusJson.ignoreStateAfter) {
			this.ignoreStateAfter = statusJson.ignoreStateAfter;
		}
	}

	initOnChange(master, oldStatus) {
		if (!this.setState) return;

		console.log(oldStatus);
		console.log(this.setStateAfter);
		console.log(this.ignoreStateAfter);
		// I'm aware, if a state is in ignore ánd set - it will be set.
		if (this.setStateAfter.length>0) {
			if (this.setStateAfter.some(s => s == oldStatus)) {
				master.setState(this.forcestate);
			}
		} 
		else if (this.ignoreStateAfter.length>0) {
			if (!(this.ignoreStateAfter.some(s => s == oldStatus))) {
				master.setState(this.forcestate);
			}
		} else {
			master.setState(this.forcestate);
		}
	}

	getTask(master) {
		return master.tasklists.getTask(this.tasklistname, master.slave.state);
	}

}

module.exports = { Status, SlaveStatus };
