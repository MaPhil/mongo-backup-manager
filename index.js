const pjson = require('./package.json');
const argv = require('minimist')(process.argv.slice(2));

const MongoManager = require('./mongodb/mongodb.js');

const mongoManeger = new MongoManager();
const help = `mongo-backup-manager \n
generel option : 
\t-v --version
\t-h --help

functions:
\tadd db
\t[--add] <dbname> [--schedule] <hh:min>
\tremove dbnam
\t[--remove <dbname>]
\trestore db 
\t[--restore] <dbname>
\trestore all dbs
\t[--restoreAll]
`; 

console.log(argv);

if(argv.add && argv.add !== '') {
	let dbName = argv.add;
	let schedule = null;
	if(argv.schedule && argv.schedule !== '') {
		schedule = argv.schedule; 
	}

	mongoManeger.addDb(dbName, schedule);

}

if(argv.remove && argv.remove !== '') {
	let dbName = argv.remove;
	mongoManeger.removeDb(dbName);

}

if(argv.restore && argv.restore !== ''){
	let dbName = argv.restore;
	mongoManeger.restoreDb(dbName);
} 

if (argv.restoreAll) {
	mongoManeger.restoreAllDbs();

}




