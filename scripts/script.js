
var runsURL = 'https://www.speedrun.com/api/v1/runs';
var gameId = 'o1y9j9v6';
var resultCount = 30;
var criteria = 'date';
var direction = 'asc';
var embedded = 'players';
var requestString = runsURL;
var category = '7kjpl1gk'

requestString += '?game=' + gameId;
requestString += '&max=' + resultCount;
requestString += '&orderby=' + criteria;
requestString += '&direction=' + direction;
requestString += '&embed=' + embedded;
requestString += '&status=verified';
requestString += '&category=' + category;

console.log(requestString);

var request = new XMLHttpRequest()
request.open('GET', requestString, true)
request.onload = function()
{
  // Begin accessing JSON data here
  var data = JSON.parse(this.response)
  if (request.status >= 200 && request.status < 400) {
    
		var bestRuns = new Array();
		data.data.forEach(run =>
		{
			var runTime = new RunTime(run.times.primary);
			var isBetter = (bestRuns.length == 0) || runTime.isBetterThan(bestRuns[bestRuns.length-1].runTime);
			
			if(isBetter)
			{
				bestRuns.push(new Run(run.players.data[0].names.international, run.date, runTime));
			}
		})
		
		console.log(bestRuns);
  }
	else
	{
		console.log("error!!!");
	}
}
request.send()


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
	constructor(rawTimeString)
	{
		this.hours = 0;
		this.minutes = 0;
		this.seconds = 0;
		this.milliseconds = 0;
		
		var hoursSplit = rawTimeString.split(/([0-9]*H)/);
		if(hoursSplit.length == 3)
		{
			this.hours = parseFloat(hoursSplit[1].substring(0, hoursSplit[1].length-1));
		}
		
		var minutesSplit = rawTimeString.split(/([0-9]*M)/);
		if(minutesSplit.length == 3)
		{
			this.minutes = parseFloat(minutesSplit[1].substring(0, minutesSplit[1].length-1));
		}
		
		var secondsSplit = rawTimeString.split(/([0-9]*\.|[0-9]*S)/);
		if(secondsSplit.length >= 3)
		{
			this.seconds = parseFloat(secondsSplit[1].substring(0, secondsSplit[1].length-1));
			if(secondsSplit.length == 5)
			{
				this.milliseconds = parseFloat(secondsSplit[3].substring(0, secondsSplit[3].length-1));
			}
		}
	}
	
	milliseconds()
	{
		return this.milliseconds;
	}
	
	toString()
	{
		var result = '[';
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
		result += ']'
		
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
