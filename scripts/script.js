var runsURL = 'http://wrhistory.ddns.net:3134/';

function launch()
{
	var game = document.getElementById('game').value;
	var category = document.getElementById('category').value;
	generateRuns(game, category)
}

function generateRuns(game, category)
{
	var request = new XMLHttpRequest()
	var requestString = runsURL + '?game=' + game + '&category=' + category;
	request.open('GET', requestString, true)
	request.onload = function()
	{
		processResponse(this.response, this.status);
	}
	request.send()
}

function processResponse(response, status)
{
	// Begin accessing JSON data here
	var data = JSON.parse(response);
	if (status >= 200 && status < 400) {
		
		makeChart(data);
	}
	else
	{
		console.log(status);
	}
}

function displayString(duration)
{
	var result = '';
	if(duration.hours() > 0)
	{
		result += duration.hours() + 'h ';
	}
	
	if(duration.minutes() > 0)
	{
		result += duration.minutes() + 'm ';
	}
	
	if(duration.seconds() > 0)
	{
		result += duration.seconds() + 's ';
	}
	
	if(duration.milliseconds() > 0)
	{
		result += duration.milliseconds() + 'ms';
	}
	
	return result;
}

var kelly_colors = ['#F3C300', '#875692', '#F38400', '#A1CAF1', '#BE0032', '#C2B280', '#848482', '#008856', '#E68FAC', '#0067A5', '#F99379', '#604E97', '#F6A600', '#B3446C', '#DCD300', '#882D17', '#8DB600', '#654522', '#E25822', '#2B3D26'];
var myChart;
function makeChart(bestRuns)
{
	var dates = [];
	var timesFloat = [];
	var runners = [];
	var uniqueRunners = [];
	var pointsBorderColors = [];
	var pointsBackgroundColors = [];	
	
	bestRuns.forEach(run =>{
		dates.push(run.date + ' 12:00');
		timesFloat.push(run.runTimeFloat);	
		runners.push(run.playerName);
		if(!uniqueRunners.includes(run.playerName))
		{
			uniqueRunners.push(run.playerName);
		}
		var color = kelly_colors[uniqueRunners.indexOf(run.playerName) % kelly_colors.length];
		pointsBorderColors.push(color);
		pointsBackgroundColors.push(color);
	});
	
	if(myChart)
	{
		myChart.destroy();
	}
	var ctx = document.getElementById('myChart').getContext('2d');
	myChart = new Chart(ctx, {
			type: 'line',
			data: {
					labels: dates,
					datasets: [{
							borderColor: 'black',
							backgroundColor: 'black',
							borderWidth: 2,
							pointBorderColor: pointsBorderColors,
							pointBackgroundColor: pointsBackgroundColors,
							steppedLine: 'before',
							data: timesFloat,
							fill: false
					}]
			},
			options: {
				legend: {
					display : false
				},
				tooltips: {
         callbacks: {
            label: function(tooltip, data) {
              return runners[tooltip.index] + ": " + displayString(moment.duration(tooltip.yLabel, 'seconds'));  
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
								return displayString(moment.duration(value, 'seconds'))
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
}
