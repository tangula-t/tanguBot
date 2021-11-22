const fs = require('fs');
const path = require('path');
const { TaskList, Task } = require('./Tasks.js');

class TaskLists {
	constructor(slavePath) {
		this.slavePath = slavePath;
		this.taskPath = path.resolve(this.slavePath, 'tasks');
	}

	async reload() {
		const taskFiles = fs.readdirSync(this.taskPath+'/').filter(files => files.endsWith(".json"));
		this.tasklists = {};
		for (const file of taskFiles) {
			let data = fs.readFileSync(path.resolve(this.taskPath, file));
			const jsonTasks = JSON.parse(data);
			for (let list in jsonTasks) {
				if (list in this.tasklists)
					console.log('WARNING: Overwriting duplicate tasklist: ' + list)
				this.tasklists[list] = new TaskList(list, jsonTasks[list]);
			}
		}
	}

	getTask(list, state) {
		if (!(list in this.tasklists)) { 
			return new Task({ chance: 1, task: 'Could not find tasklist: ' + list});
		}
		return this.tasklists[list].getTask(state);
	}

	getOverview(list, state) {
		if (!(list in this.tasklists)) { 
			return "No such list: " + list;
		}
		return this.tasklists[list].getOverview(state);
		
	}
}

module.exports = TaskLists;
