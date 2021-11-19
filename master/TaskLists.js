const fs = require('fs');
const path = require('path');
const { TaskList, Task } = require('./Tasks.js');

class TaskLists {
	constructor(slavePath) {
		this.slavePath = slavePath;
//		this.reload();
	}

	async reload() {
		let data = fs.readFileSync(path.resolve(this.slavePath, 'tasks.json'));
		const jsonTasks = JSON.parse(data);
		this.tasklists = {};
		for (let list in jsonTasks) {
			this.tasklists[list] = new TaskList(list, jsonTasks[list]);
		}
	}

	getTask(list, state) {
		if (!(list in this.tasklists)) { 
			return new Task({ chance: 1, task: 'Could not find tasklist: ' + list});
		}
		return this.tasklists[list].getTask(state);
	}

}

module.exports = TaskLists;
