

class Run
{
	constructor(playerName, date, runTime)
	{
		this.playerName = playerName;
		this.date = date;
		this.runTime = runTime;
	}
}

class RunTime
{
	constructor(hours, minutes, seconds, milliseconds)
	{
		this.hours = hours;
		this.minutes = minutes;
		this.seconds = seconds;
		this.milliseconds = milliseconds;
	}
	
	static fromScore(score)
	{
		var currentScore = score;
		var hours = Math.floor(currentScore / 3600000);
		currentScore = currentScore - hours * 3600000;
		var minutes = Math.floor(currentScore / 60000);
		currentScore = currentScore - minutes * 60000;
		var seconds = Math.floor(currentScore / 1000); 
		var milliseconds = currentScore % 1000;
		return new RunTime(hours, minutes, seconds, milliseconds);
	}
	
	static fromString(rawTimeString)
	{
		var hours = 0;
		var minutes = 0;
		var seconds = 0;
		var milliseconds = 0;
		
		var hoursSplit = rawTimeString.split(/([0-9]*H)/);
		if(hoursSplit.length == 3)
		{
			hours = parseFloat(hoursSplit[1].substring(0, hoursSplit[1].length-1));
		}
		
		var minutesSplit = rawTimeString.split(/([0-9]*M)/);
		if(minutesSplit.length == 3)
		{
			minutes = parseFloat(minutesSplit[1].substring(0, minutesSplit[1].length-1));
		}
		
		var secondsSplit = rawTimeString.split(/([0-9]*\.|[0-9]*S)/);
		if(secondsSplit.length >= 3)
		{
			seconds = parseFloat(secondsSplit[1].substring(0, secondsSplit[1].length-1));
			if(secondsSplit.length == 5)
			{
				milliseconds = parseFloat(secondsSplit[3].substring(0, secondsSplit[3].length-1));
			}
		}
		
		return new RunTime(hours, minutes, seconds, milliseconds);
	}
	
	score()
	{
		var result = 0;
		result += this.hours * 3600000;
		result += this.minutes * 60000;
		result += this.seconds * 1000;
		result += this.milliseconds;
		return result;
	}
	
	toString()
	{
		var result = '';
		if(this.hours > 0)
		{
			result += this.hours + 'h ';
		}
		
		if(this.minutes > 0)
		{
			result += this.minutes + 'm ';
		}
		
		if(this.seconds > 0)
		{
			result += this.seconds + 's ';
		}
		
		if(this.milliseconds > 0)
		{
			result += this.milliseconds + 'ms';
		}
		
		return result;
	}
	
	isBetterThan(otherRunTime)
	{
		if(this.hours != otherRunTime.hours)
		{
			return this.hours < otherRunTime.hours;
		}
		
		if(this.minutes != otherRunTime.minutes)
		{
			return this.minutes < otherRunTime.minutes;
		}
		
		if(this.seconds != otherRunTime.seconds)
		{
			return this.seconds < otherRunTime.seconds;
		}
		
		if(this.milliseconds != otherRunTime.milliseconds)
		{
			return this.milliseconds < otherRunTime.milliseconds;
		}
		
		return false;
	}
}

var runsURL = 'https://www.speedrun.com/api/v1/runs';
var gameId = 'o1y9j9v6';//smb 'om1m3625';//celeste :'o1y9j9v6';
var resultCount = 200;
var criteria = 'date';
var direction = 'asc';
var embedded = 'players';
var requestString = runsURL;
var category = '7kjpl1gk';//smb any% 'w20p0zkn';//celeste any% '7kjpl1gk'

requestString += '?game=' + gameId;
requestString += '&orderby=' + criteria;
requestString += '&direction=' + direction;
requestString += '&embed=' + embedded;
requestString += '&status=verified';
requestString += '&category=' + category;
requestString += '&max=' + resultCount;

generateChart();
function generateChart()
{
	var currentIdx = 0;
	var bestRuns = [];
	generateRuns(currentIdx, bestRuns);
}

function generateRuns(idx, bestRuns)
{
	var request = new XMLHttpRequest()
	request.open('GET', requestString + '&offset=' + idx, true)
	request.onload = function()
	{
		processResponse(this.response, this.status, idx, bestRuns);
	}
	request.send()
}

function processResponse(response, status, idx, bestRuns)
{
	// Begin accessing JSON data here
	var data = JSON.parse(response);
	if (status >= 200 && status < 400) {
		
		data.data.forEach(run =>
		{
			var runTime = RunTime.fromString(run.times.primary);
			var isBetter = (bestRuns.length == 0) || runTime.isBetterThan(bestRuns[bestRuns.length-1].runTime);
			
			if(isBetter)
			{
				var playerName = '';
				if(run.players.data[0].hasOwnProperty('names'))
				{
					playerName = run.players.data[0].names.international;
				}
				else
				{
					playerName = run.players.data[0].name;
				}
				bestRuns.push(new Run(playerName, run.date, runTime));
			}
		})
		
		if(data.data.length == 200)
		{
			generateRuns(idx+200, bestRuns);
		}
		else
		{
			makeChart(bestRuns);
		}
	}
	else
	{
		console.log(status);
	}
}

function makeChart(bestRuns)
{
	var kelly_colors = ['#F3C300', '#875692', '#F38400', '#A1CAF1', '#BE0032', '#C2B280', '#848482', '#008856', '#E68FAC', '#0067A5', '#F99379', '#604E97', '#F6A600', '#B3446C', '#DCD300', '#882D17', '#8DB600', '#654522', '#E25822', '#2B3D26'];
	var dates = [];
	var times = [];
	var runners = [];
	var uniqueRunners = [];
	bestRuns.forEach(run =>{
		dates.push(run.date + ' 12:00');
		times.push(run.runTime.score());	
		runners.push(run.playerName);
		if(!uniqueRunners.includes(run.playerName))
		{
			uniqueRunners.push(run.playerName);
		}
	});
	
	var ctx = document.getElementById('myChart').getContext('2d');
	var pointsBorderColors = [];
	var pointsBackgroundColors = [];
	var myChart = new Chart(ctx, {
			type: 'line',
			data: {
					labels: dates,
					datasets: [{
							label: 'WR',
							borderColor: 'black',
							backgroundColor: 'black',
							borderWidth: 2,
							pointBorderColor: pointsBorderColors,
							pointBackgroundColor: pointsBackgroundColors,
							steppedLine: 'before',
							data: times,
							fill: false
					}]
			},
			options: {
			 tooltips: {
         callbacks: {
            label: function(tooltip, data) {
              return runners[tooltip.index] + ": " + RunTime.fromScore(tooltip.yLabel).toString();  
						}
         },
				 mode: 'index',
				 intersect: false
				},
				scales: {
					xAxes: [{
						type: 'time',
						time: {
							parser: 'YYYY-MM-DD HH:mm',
							unit: 'month',
							tooltipFormat: 'YYYY-MM-DD'
						},
						scaleLabel: {
							display: true,
							labelString: 'Date'
						}
					}],
					yAxes: [{
						ticks: {
							beginAtZero: true,
							callback: function(value, index, values) {
								return RunTime.fromScore(value).toString();
							}
						},
						scaleLabel: {
							display: true,
							labelString: 'Time'
						}
					}]
				}
			}
	});
	
	for (i = 0; i < myChart.data.datasets[0].data.length; i++)
	{
		var color = kelly_colors[uniqueRunners.indexOf(bestRuns[i].playerName) % kelly_colors.length];
		pointsBorderColors.push(color);
		pointsBackgroundColors.push(color);
	}
	myChart.update();
}
