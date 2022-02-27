const fs = require('fs');
const path = require('path');
const { TaskList, Task } = require('./Tasks.js');
const TaskInstance = require('./TaskInstance.js');

const statusesFile = 'statuses.json';

class SlaveStatus {
	constructor(master, slavePath) {
		this.slavePath = slavePath;
		this.activeStatus = 'unknown'
		this.load(master, 'unknown');
	}

	load(master, activeStatus) {
		this.getStatus().stopTimer();
		this.activeStatus = activeStatus;
		let data = fs.readFileSync(path.resolve(this.slavePath, statusesFile));
		const jsonStatuses = JSON.parse(data);
		
		this.statuses = {};
		for (let s in jsonStatuses) {
			this.statuses[s] = new Status(jsonStatuses[s]);
		}
		this.getStatus().startTimer(master);
	}

	statusExists(status) {
		return this.statuses.some(s => s == status);
	}

	getValidStatusString() {
		return Object.keys(this.statuses).sort().join(', ');
	}

	setStatus(master, newStatus) {
		if (!(newStatus in this.statuses)) return false;

		let oldStatus = this.activeStatus;
		this.getStatus().stopTimer();
		this.activeStatus = newStatus;
		let status = this.getStatus();
		status.initOnChange(master, oldStatus);	
		status.startTimer(master);

		return true;
	}

	getStatus() {
		if (this.statuses && this.activeStatus in this.statuses) {
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
		this.hasTimer = false;
		this.setState = false;
		this.intervalObj = null;
		this.master = null;
		
		this.setStateAfter = [];
		this.ignoreStateAfter = [];

		if (statusJson.tasklist) {
			this.tasklistname = statusJson.tasklist;
			this.hasTask = true;
		}
		if (statusJson.timer) {
			if (statusJson.timer.time && statusJson.timer.tasklist) {
				this.timer = 1000* parseInt(statusJson.timer.time, 0);
				this.timerTasklistname = statusJson.timer.tasklist;
				this.hasTimer = this.timer > 0;
				console.log(this.hasTimer);
			}
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

	stopTimer() {
		clearInterval(this.intervalObj);
	}

	startTimer(master) {
		this.master = master;
		if (this.hasTimer) {
			if (this.intervalObj) { 
				this.stopTimer();
			}
			var me = this;

			this.intervalObj = setInterval(() => { me.onTimer() }, this.timer);
		}
	}

	onTimer() {
		const task = this.getTimerTask(this.master);
		if (!task.isEmpty()) {
	       		const taskInstance = new TaskInstance(task, this.master);
			taskInstance.sendTask(this.master.discord.channel, 'New Task!', 'A new status timer task was picked');
			this.master.messagePrivate('New task!');
		}
	}

	initOnChange(master, oldStatus) {
		if (!this.setState) return;

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
	
	getTimerTask(master) {
		return master.tasklists.getTask(this.timerTasklistname, master.slave.state);
	}

}

module.exports = { Status, SlaveStatus };
