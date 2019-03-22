var MongoClient = require('mongodb').MongoClient;
var databaseURL = "mongodb://localhost:27017/";
const request = require('request-promise')
var htmlPort = 8080;
var jsonPort = 9237;
var http = require('http')
var url = require('url')

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

var fs = require('fs')
var path = require('path')
var baseDirectory = '../'   // or whatever base directory you want

http.createServer(function (request, response) {
    try {
				console.log('Connexion HTTP ! ')
        var requestUrl = url.parse(request.url)

        // need to use path.normalize so people can't access directories underneath baseDirectory
        var fsPath = baseDirectory+path.normalize(requestUrl.pathname)
				console.log('Connexion HTTP ! ' + requestUrl.pathname)
        var fileStream = fs.createReadStream(fsPath)
        fileStream.pipe(response)
        fileStream.on('open', function() {
						response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'})
				})
        fileStream.on('error',function(e) {
             response.writeHead(404)     // assume the file doesn't exist
             response.end()
        })
   } catch(e) {
        response.writeHead(500)
        response.end()     // end the response so browsers don't hang
        console.log(e.stack)
   }
	 
}).listen(htmlPort)


http.createServer(async function (req, res) {
	
	console.log("Connexion JSON ! " + req.headers.origin);
	res.setHeader("Access-Control-Allow-Origin", '*');
	res.setHeader("Access-Control-Allow-Request-Method", "GET");
	res.setHeader("Content-Type", "text/plain");
  var q = url.parse(req.url, true).query;
	var game = getGame(q.game);
	console.log("check DB")
	var isInDB = await isInDatabase(game);
	if(!isInDB)
	{
		await registerGameHistory(game);
		
	}
	
	console.log("get runs")
	var runs = await getRuns();
	console.log("writing response")
	res.write(JSON.stringify(runs));
	res.end();
	console.log("response OK")


}).listen(jsonPort);

function getGame(gameName)
{
	
}

function isInDatabase(game)
{
	return new Promise(resolve=>{
		MongoClient.connect(databaseURL, function(err, db) {
			if (err) throw err;
			var dbo = db.db("mydb");
			dbo.collection("celesteRuns").findOne({}, function(err, result) {
				console.log("results" + result)
				db.close();
				resolve(result);
			});
		});
	});
}

function registerGameHistory(game, res)
{
	generateRuns(0, [], res);
}

function getGameHistory(game)
{
}

var runsURL = 'https://www.speedrun.com/api/v1/runs';
var gameId = 'o1y9j9v6';//smb 'om1m3625';//celeste :'o1y9j9v6';
var resultCount = 200;
var criteria = 'date';
var direction = 'asc';
var embedded = 'players';
var requestString = runsURL;
var category = '7kjpl1gk';//smb any% 'w20p0zkn';//celeste any% '7kjpl1gk'

function generateRuns(idx, bestRuns, res)
{	
	var options = {
		method: 'GET',
		uri: 'https://www.speedrun.com/api/v1/runs',
		json: true,	
		qs: {
			offset: idx,
			game: 'o1y9j9v6',
			orderby: 'date',
			direction: 'asc',
			max: 200,
			category: '7kjpl1gk',
			status: 'verified',
			embed: 'players'
		}
	}
	
	request(options)
		.then(function (response) {
			processResponse(response, idx, bestRuns);
		})
		.catch(function (err) {
			console.log(err)
		});
}

function processResponse(data, idx, bestRuns)
{	
	console.log("process response " + data.data.length)
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
		registerRuns(bestRuns);
	}
}

function registerRuns(bestRuns)
{
	console.log("best runs : " + bestRuns.length)
	MongoClient.connect(databaseURL, function(err, db) {
	if (err) throw err;
	var dbo = db.db("mydb");
	dbo.collection("celesteRuns").insertMany(bestRuns, function(err) {
			if (err) throw err;
			console.log("Inserted");
			db.close();
		});
	});
}

function getRuns()
{
	return new Promise(resolve=>{
		
		MongoClient.connect(databaseURL, function(err, db) {
		if (err) throw err;
		var dbo = db.db("mydb");
		dbo.collection("celesteRuns").find({}).toArray(function(err, result) {
			db.close();
			console.log("getRuns " + result.length)
			resolve(result)
			});
		}); 
	});
}

function flushDatabase()
{
	MongoClient.connect(databaseURL, function(err, db) {
  if (err) throw err;
  var dbo = db.db("mydb");
  var myquery = {};
  dbo.collection("celesteRuns").deleteMany(myquery, function(err, obj) {
    if (err) throw err;
    console.log(obj.result.n + " document(s) deleted");
    db.close();
  });
});
}

