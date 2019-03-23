var MongoClient = require('mongodb').MongoClient;
var databaseURL = "mongodb://localhost:27017/";
const request = require('request-promise')
var htmlPort = 8080;
var jsonPort = 9237;
var http = require('http')
var url = require('url')

class Run
{
	constructor(playerName, date, runTimeF, runTimeS)
	{
		this.playerName = playerName;
		this.date = date;
		this.runTimeFloat = runTimeF;
		this.runTimeString = runTimeS;
	}
}

var db;
MongoClient.connect(databaseURL, {useNewUrlParser:true}, function(err, database) {
  if(err) throw err;

  db = database;
});

var fs = require('fs')
var path = require('path')
var baseDirectory = '../'   // or whatever base directory you want

http.createServer(function (request, response) {
	console.log('connexion ! ' + request.url);
	try {
			var requestUrl = url.parse(request.url)

			// need to use path.normalize so people can't access directories underneath baseDirectory
			var fsPath = baseDirectory+path.normalize(requestUrl.pathname)
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
	
	console.log('Connexion JSON')
	res.setHeader("Access-Control-Allow-Origin", '*');
	res.setHeader("Access-Control-Allow-Request-Method", "GET");
	res.setHeader("Content-Type", "text/plain; charset=utf-8");
  var q = url.parse(req.url, true).query;
	var game = getGame(q.game);
	var runs = await getRuns();
	if(!runs || runs.length == 0)
	{
		console.log("generate runs")
		runs = await generateRuns();
		console.log("ok")

	}
	
	res.write(JSON.stringify(runs));
	res.end();
	
}).listen(jsonPort);

function getGame(gameName)
{
	
}

function isInDatabase(game)
{
	return new Promise(resolve=>{
			var dbo = db.db("mydb");
			dbo.collection("celesteRuns").findOne({}, function(err, result) {
				db.close();
				resolve(result);
			});
	});
}

var runsURL = 'https://www.speedrun.com/api/v1/runs';
var gameId = 'o1y9j9v6';//smb 'om1m3625';//celeste :'o1y9j9v6';
var resultCount = 200;
var criteria = 'date';
var direction = 'asc';
var embedded = 'players';
var requestString = runsURL;
var category = '7kjpl1gk';//smb any% 'w20p0zkn';//celeste any% '7kjpl1gk'

function generateRuns(game)
{
	return new Promise(resolve => async function(){
		var idx = 0;
		var bestRuns = [];
		var hasFinished = false;
		
		while(!hasFinished)
		{
			var result = await requestGameRuns(idx);
			result.forEach(run=>{
				if(bestRuns.length == 0 || run.runTimeFloat < bestRuns[bestRuns.length-1].runTimeFloat)
				{
					bestRuns.push(run);
				}
			})
			hasFinished = (result.length < 200)
			idx += 200;
		}
		
		await registerRuns(bestRuns);
		resolve(bestRuns);
	});
}

async function requestGameRuns(idx)
{	
	return new Promise(resolve =>{
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
				console.log("request")

		request(options)
			.then(function(response){
				
				console.log("process response " + response.data.length)
				var runs = [];
				response.data.forEach(run =>{
					var runTimeFloat = run.times.primary_t;
					var runTimeString = run.times.primary;
					var playerName = '';
					if(run.players.data[0].hasOwnProperty('names'))
					{
						playerName = run.players.data[0].names.international;
					}
					else
					{
						playerName = run.players.data[0].name;
					}
					runs.push(new Run(playerName, run.date, runTimeFloat, runTimeString));
				})
				resolve(runs)
			})
			.catch(function (err) {
				console.log(err)
			});
	});
}


function registerRuns(bestRuns)
{
	return new Promise(resolve => {
		var dbo = db.db("mydb");
		dbo.collection("celesteRuns").insertMany(bestRuns, function(err) {
			if (err) throw err;
			console.log('ok')
			resolve()
		});
	});
}

function getRuns()
{
	return new Promise(resolve=>{
		var dbo = db.db("mydb");
		dbo.collection("celesteRuns").find({}).toArray(function(err, result) {
			resolve(result)
		});
	});
}

function flushDatabase()
{
	MongoClient.connect(databaseURL, {useNewUrlParser:true}, function(err, db) {
  if (err) throw err;
  var dbo = db.db("mydb");
  var myquery = {};
  dbo.collection("celesteRuns").deleteMany(myquery, function(err, obj) {
    if (err) throw err;
    console.log(obj.result.n + " document(s) deleted");
  });
});
}

