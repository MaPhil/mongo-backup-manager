const sicro = require('../simpple-cron/index.js')
const exec = require('child_process').exec;

const defaultDumpDir = '/home/loki/beckapp';



class MongoManager {
	constructor() {}
	
	addDb(dbName, schedule) {
		let timer = '* * * * * ';
		if(schedule !== null) {
			console.log(schedule);
			timer = schedule.split(':').reverse().join(' ').concat(' * * * ');
			console.log(timer);
		}
		sicro.add(dbName, `${timer}mongodump --db ${dbName} --out ${defaultDumpDir}`)
			 .then(() => {
			 	sicro.status()
			 });
	}

	removeDb(dbName) {
		sicro.remove(dbName)
			 .then(() => {
			 	sicro.status();
			 })
	} 

	restoreDb(dbName) {
		exec(`mongorestore --db ${dbName} --drop /home/loki/beckapp/{$dbName}/`, (err, stdout, stderr) => {
			if(err) throw stderr;

			console.log(stdout);
		});
	}	

	restoreAllDbs() {
		exec(`mongorestore  --drop /home/loki/beckapp/`, (err, stdout, stderr) => {
			if(err) throw stderr;
			console.log(stdout);
		});
	}
}



module.exports = MongoManager;


