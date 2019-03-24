var MongoClient = require('mongodb').MongoClient;
var databaseURL = "mongodb://localhost:27017/";
var speedrunURLRoot = 'https://www.speedrun.com/api/v1/';
const request = require('request-promise')
var htmlPort = 8080;
var jsonPort = 9237;
var http = require('http')
var url = require('url')
var fs = require('fs')
var path = require('path')
var baseDirectory = '../'

class Run
{
	constructor(gameId, categoryId, playerName, date, runTimeF, runTimeS)
	{
		this.gameId = gameId;
		this.categoryId = categoryId;
		this.playerName = playerName;
		this.date = date;
		this.runTimeFloat = runTimeF;
		this.runTimeString = runTimeS;
	}
}

class Game
{
	constructor(name, id)
	{
		this.name = name;
		this.id = id;
	}
}

class Category
{
	constructor(name, id, gameId)
	{
		this.name = name;
		this.id = id;
		this.gameId = gameId;
	}
}

var db;
MongoClient.connect(databaseURL, {useNewUrlParser:true}, function(err, database) {
  if(err) throw err;

  db = database;
	//flushDatabase();
	launchListening();
});

function launchListening()
{
	http.createServer(handleHTTPRequest).listen(htmlPort)
	http.createServer(handleRunsRequest).listen(jsonPort)
	console.log('App running !')
}

function handleHTTPRequest(request, response)
{
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
}

async function handleRunsRequest(request, response) 
{
	response.setHeader("Access-Control-Allow-Origin", '*');
	response.setHeader("Access-Control-Allow-Request-Method", "GET");
	response.setHeader("Content-Type", "text/plain; charset=utf-8");
  var q = url.parse(request.url, true).query;
	
	var gameName = q.game;
	var categoryName = q.category;
	console.log('Connexion JSON : ' + gameName + ' - ' + categoryName)

	var gameCategory = await getGameAndCategory(gameName, categoryName);
	if(!gameCategory[0] || !gameCategory[1])
	{
		gameCategory = await generateGameAndCategory(gameName, categoryName)
		runs = await generateRuns(gameCategory[0].id, gameCategory[1].id)
	}
	else
	{
		var runs = await getRuns(gameCategory[0].id, gameCategory[1].id);
		if(!runs || runs.length == 0)
		{
			runs = await generateRuns(gameCategory[0].id, gameCategory[1].id);
		}
	}
	
	response.write(JSON.stringify(runs));
	response.end();
};

function getGameAndCategory(gameName, categoryName)
{
	var gameRequest = {name : gameName}
	var dbo = db.db("mydb");
	return new Promise(resolve=>{
		dbo.collection("games").findOne(gameRequest, function(err, gameResult){
			
			if(gameResult)
			{
				var categoryRequest = {gameId:gameResult.id, name:categoryName};
				dbo.collection("categories").findOne(categoryRequest, function(err, categoryResult){
					
					resolve([gameResult, categoryResult]);
				});
			}
			else
			{
				var categoryResult
				resolve([gameResult, categoryResult]);
			}

		});
	});
}

async function generateGameAndCategory(gameName, categoryName)
{
	var gameCategories = await requestGame(gameName)
	Promise.all([registerGame(gameCategories[0]), registerCategories(gameCategories[1])]);
	
	var category;
	for(var i = 0; !category && i < gameCategories[1].length; ++i)
	{
		if(gameCategories[1][i].name == categoryName)
		{
			category = gameCategories[1][i]
		}
	}
	
	
	return new Promise(resolve => {
		resolve([gameCategories[0], category]);
	});
}

function registerGame(game)
{
	var dbo = db.db("mydb");
	return new Promise(resolve => {
		dbo.collection("games").insertOne(game, function(err) {
			if (err) throw err;
			resolve()
		});
	});
}

function registerCategories(categories)
{
	var dbo = db.db("mydb");
	return new Promise(resolve => {
		dbo.collection("categories").insertMany(categories, function(err) {
			if (err) throw err;
			resolve()
		});
	});
}

 function requestGame(gameName)
{	
	var options = {
		method: 'GET',
		uri: speedrunURLRoot + 'games',
		json: true,	
		qs: {
			name: gameName,
			max: 1,
			embed: 'categories'
		}
	}
	
	return new Promise(resolve =>{
		request(options)
			.then(function(response){
				var game = response.data[0];
				var id = game.id;
				var name = game.names.international;
				var categories = [];
				game.categories.data.forEach(category => {
					if(category.type == 'per-game')
					{
						var categoryName = category.name;
						var categoryId = category.id;
						categories.push(new Category(categoryName, categoryId, id));
					}
				});
				var gameResult = new Game(name, id)
				resolve([gameResult, categories]);
			})
	});
}

var resultCount = 200;
var criteria = 'date';
var direction = 'asc';
var embedded = 'players';

async function generateRuns(gameId, categoryId)
{	
	var idx = 0;
	var bestRuns = [];
	var hasFinished = false;
	
	while(!hasFinished)
	{
		var result = await requestGameRuns(gameId, categoryId, idx);
		result.forEach(run=>{
			if(run.playerName && run.date != null && (bestRuns.length == 0 || run.runTimeFloat < bestRuns[bestRuns.length-1].runTimeFloat))
			{
				bestRuns.push(run);
			}
		})
		hasFinished = (result.length < 200)
		idx += 200;
	}
	await registerRuns(bestRuns);
	
	return new Promise(resolve => {
		resolve(bestRuns);
	});
}

async function requestGameRuns(gameId, categoryId, idx)
{	
	var options = {
		method: 'GET',
		uri: speedrunURLRoot + 'runs',
		json: true,	
		qs: {
			offset: idx,
			game: gameId,
			orderby: 'date',
			direction: 'asc',
			max: 200,
			category: categoryId,
			status: 'verified',
			embed: 'players'
		}
	}

	return new Promise(resolve =>{
		request(options)
			.then(function(response){			
				var runs = [];
				response.data.forEach(run =>{
					var runTimeFloat = run.times.primary_t;
					var runTimeString = run.times.primary;
					var playerName = '';
					if(run.players.data[0])
					{
						if(run.players.data[0].hasOwnProperty('names'))
						{
							playerName = run.players.data[0].names.international;
						}
						else
						{
							playerName = run.players.data[0].name;
						}
					}
					runs.push(new Run(gameId, categoryId, playerName, run.date, runTimeFloat, runTimeString));						
				})
				resolve(runs)
			})
	});
}


function registerRuns(bestRuns)
{
	return new Promise(resolve => {
		var dbo = db.db("mydb");
		dbo.collection("runs").insertMany(bestRuns, function(err) {
			resolve()
		});
	});
}

function getRuns(gameId, categoryId)
{
	var dbo = db.db("mydb");
	var request = {gameId:gameId, categoryId:categoryId}
	return new Promise(resolve=>{
		dbo.collection("runs").find(request).sort({date:1}).toArray(function(err, result) {
			resolve(result)
		});
	});
}

function flushDatabase()
{
  var dbo = db.db("mydb");
  var myquery = {};
  dbo.collection("games").deleteMany(myquery, function(err, obj) {
    console.log(obj.result.n + " document(s) deleted");
  });
  dbo.collection("categories").deleteMany(myquery, function(err, obj) {
    console.log(obj.result.n + " document(s) deleted");
  });
  dbo.collection("runs").deleteMany(myquery, function(err, obj) {
    console.log(obj.result.n + " document(s) deleted");
  });
}

