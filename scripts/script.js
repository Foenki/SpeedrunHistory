
var runsURL = 'https://www.speedrun.com/api/v1/runs';
var gameId = 'o1y9j9v6';
var resultCount = 10;
var criteria = 'date';
var direction = 'desc';
var embed = 'players,category';
var requestString = runsURL;

requestString += '?game=' + gameId;
requestString += '&max=' + resultCount;
requestString += '&orderby=' + criteria;
requestString += '&direction=' + direction;
requestString += '&embed=' + embed;
requestString += '&status=verified';

console.log(requestString);

var request = new XMLHttpRequest()
request.open('GET', requestString, true)
request.onload = function() {
  // Begin accessing JSON data here
  var data = JSON.parse(this.response)
  if (request.status >= 200 && request.status < 400) {
    
		data.data.forEach(run => {console.log(run.players.data[0].names.international + " " + run.category.data.name + " " + run.times.primary + " " + run.date + "\n")})
  }
	else
	{
		console.log("error!!!");
	}
}
request.send()