function rnd(sMin,sMax) {
	const min = Number(sMin);
	const max = Number(sMax);
	return min + Math.round((Math.random()*(max-min)));
}

function weightedRandom(prob) {
  let i, sum=0, r=Math.random();
  for (i in prob) {
      sum += prob[i];
      if (r <= sum) return i;
  }
}

function parseSingleNumber(str, match) {
	return rnd(1,match);
}

function parseDoubleNumber(str, min, max) {
	let answer = rnd(min, max);
	return answer;
}

function parseOptions(str, choicesStr) {
	const choices = choicesStr.split('|');
	const i = rnd(0,choices.length-1);
	return choices[i];
}

function parsePercent(str, percentStr) {
	const optionsStr = percentStr.split(';');
	let total = 0;
	let options = [];
	let chance = {};
	for (let i=0; i<optionsStr.length; i++) {
		const option = optionsStr[i].split('%');
		chance[i] = option[0]/100;
		options.push(option[1]);
		total += chance[i];
	}
	if (total<1) { 
		chance[options.length] = (1-total);
		options.push('NOTHING:NOT100%');
	}
	const index = weightedRandom(chance);
	return options[index];
}


function parseOrder(order) {
	// Test for 'number'
	// [#] : between 1 and #
	order = order.replace(/\[(\d+)\]/g, parseSingleNumber);
	// [#:#] : between # and #
	order = order.replace(/\[(\d+)\:(\d+)\]/g, parseDoubleNumber);
	// [..?] : 50/50 to print this
	order = order.replace(/\[(\d+)\:(\d+)\]/g, parseDoubleNumber);
	// [x|y|..|z] x,y,.. or z
	order = order.replace(/\[([^|]+|[^\]]+)\]/g, parseOptions);

	// (#%[];#%[]) Extra chances: [] have already been removed
	order = order.replace(/\((\d+%[^;]+;[^\)]+)\)/g, parsePercent);
	return order;
}

module.exports = {
	random: rnd,
	randomWeighted: weightedRandom,
	parseOrder: parseOrder
}
