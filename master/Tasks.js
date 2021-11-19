const orderUtil = require('./orders.js');
const { parse, eval } = require('expression-eval');

class TaskList {
	constructor(name, tasks) {
		this.name = name;
		this.tasks = [];
		this.parse(tasks);
	}

	parse(tasks) {
		for (let task of tasks) {
			this.tasks.push(new Task(task));
		}
	}

	getChances(state) {
		for (let task of this.tasks) {
			const chance = task.getChance(state);
		}
	}

	calculateChances(state) {
		let result = [];
		let total = 0;
		for (let i = 0; i<this.tasks.length; i++) {
			result[i] = this.tasks[i].getChance(state);
			total = total + result[i];
		}
		for (let i = 0; i<result.length; i++) {
			result[i] = result[i]/total;
		}
		return result;
	}
	
	getTask(state) {
		let chances = this.calculateChances(state);
		let taskId = orderUtil.randomWeighted(chances);
		return this.tasks[taskId];
	}
}

class Task {
	constructor(task) {
		this.parse(task);
	}

	parse(task) {
		this.rawTask = task.task;
		this.chance = new TaskChance(task.chance);
		if (task.replies) {
  			this.parseReplies(task.replies); 
		}
		if (task.timeout) {
			this.timeout = task.timeout;
		}
	}

	parseReplies(replies) {
		this.replies = {};
		for (let reply in replies) {
			this.replies[reply] = replies[reply];
		}
	}

	getChance(state) {
		return this.chance.getChance(state);
	}

	taskStr() {
		return orderUtil.parseOrder(this.rawTask);
	}
}

class TaskChance {
	constructor (chance) {
		if (typeof chance != "number") {
			this.chance = false;
			this.chances = chance;
		} else {
			this.chance = chance;
		}
	}

	getChance(state) {
		if (!this.chance) {
			for (var eq in this.chances) {
				var e = parse(eq);
				if (eval (e, state)) {
					return this.chances[eq];
				}
			}
			return 0;
		} else {
			return this.chance;
		}
	}
}

module.exports = TaskChance;

module.exports = { TaskList, Task, TaskChance };
