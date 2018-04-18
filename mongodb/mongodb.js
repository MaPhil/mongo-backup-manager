const sicro = require('sicro');
const exec = require('child_process').exec;
const path = require('path');
const Utils = require('../utils');



const Ftp = require('../ftp/index.js');


// const NODE_ENV = process.env.NODE_ENV = 'development';
// const NODE_ENV = process.env.NODE_ENV = 'production';

class MongoManager {
	constructor() { }

	dumpToRemote(paramsObj) {
		let { db, host, port, user, password, schedule } = paramsObj;
		if (schedule) {
			if (!Utils.checkSchedule(schedule)) {
				console.log('Bad param to sicro, for more info visit http://www.nncron.ru/help/EN/working/cron-format.htm');
				return;
			}
		}
		let dbWithTimeDump = db + Utils.formDate();
		let pathToTemp = path.resolve(__dirname, `../temp/${db}`);

		Utils.createDir(pathToTemp).then(() => {
		
			mongoDump(db, pathToTemp).then(() => {
				let ftp = new Ftp(paramsObj);
				let dupmPath = `${pathToTemp}`;
				Utils.createDir(dupmPath).then(() => {
					ftp.putToRemote(dupmPath, dbWithTimeDump, db).then(() => {
						if (schedule) {
							let pathToMain = path.resolve(__dirname, '../index.js');
							let sicroDescription = `${schedule} ${process.execPath} ${pathToMain} --dump remote --db ${db} --host ${host} --port ${port} --user ${user} --password ${password}`;
							addSicro(db, sicroDescription);
						}
					}).catch((err) => {
						// Utils.removeDir(dupmPath);
						console.log(err);
					});
				}).catch(err => {
					Utils.logErr(err);
				});
			});
		}).catch((err) => {
			Utils.logErr(err);
		});
	}

getRemoteListWithDump(paramsObj) {
	let ftp = new Ftp(paramsObj);
	let dumpDir = paramsObj.db || '';
	ftp.getDumpList(dumpDir);
}

getLocalListWithDump(paramsObj) {
	let { db } = paramsObj;
	let pathToDump = '';
	if (db && db !== '') {
		pathToDump = path.resolve(__dirname, `../dump/${db}`);
	} else {
		pathToDump = path.resolve(__dirname, '../dump');
		console.log('local list', pathToDump);
	}
	Utils.dirList(pathToDump).then((result) => {
		console.log(result);
	}).catch(err => console.log(err));
}

dumpToLocal(paramsObj) {
	let { db, schedule } = paramsObj;
	if (schedule) {
		if (!Utils.checkSchedule(schedule)) {
			console.log('Bad param to sicro, for more info visit http://www.nncron.ru/help/EN/working/cron-format.htm');
			return;
		}
	}
	let dumpTimeDir = db + Utils.formDate(db);
	let dumpDir = path.resolve(__dirname, `../dump/${db}/${dumpTimeDir}`);
	Utils.createDir(dumpDir).then((dumpDir) => {

		mongoDump(db, dumpDir).then(() => {
			if (schedule) {

				let pathToMain = path.resolve(__dirname, '../index.js');
				let sicroDescription = `${schedule} ${process.execPath} ${pathToMain} --dump local --db ${db}`;
				addSicro(db, sicroDescription);
			}
		}).catch((err) => {
			Utils.logErr(err);
		});
	}).catch((err) => {
		Utils.logErr(err);
	});

}

restoreDbFromRemote(paramsObj) {
	let { db } = paramsObj;
	let ftp = new Ftp(paramsObj);
	ftp.getLastDumpRemote(db).then((result) => {
		ftp.getFromRemote(db, result).then((path) => {
			restoreDb(db, path);
		}).catch((err) => {
			Utils.logErr(err);
		});
	}).catch((err) => {
		Utils.logErr(err);
	});

}

restoreSpecificFromRemote(paramsObj) {
	let ftp = new Ftp(paramsObj);
	let { db, specific } = paramsObj;
	ftp.getFromRemote(db, specific).then((path) => {
		restoreDb(db, path);
	}).catch(err => Utils.logErr(err));
}

restoreAllFromRemote(paramsObj) {
	let ftp = new Ftp(paramsObj);
	ftp.returnAllDumpsRemote().then((result) => {
		if (result) {
			result.forEach(item => {
				ftp.getLastDumpRemote(item).then((result) => {
					ftp.getFromRemote(item, result).then((path) => {
						restoreDb(item, path);
					}).catch((err) => {
						Utils.logErr(err);
					});
				});
			});
		}
	}).catch((err) => {
		Utils.logErr(err);
	});
}

restoreFromLocal(paramsObj) {
	let { db } = paramsObj;
	console.log(db);
	let pathToDir = path.resolve(__dirname, `../dump/${db}`);
	console.log(pathToDir);
	Utils.dirList(pathToDir).then((result) => {
		let pathToLastFile = Utils.lastedFile(result);
		let pathToDump = path.resolve(__dirname, `../dump/${db}/${pathToLastFile}/${db}`);
		console.log('path to dump ', pathToDump);
		restoreDb(db, pathToDump);
	}).catch(err => Utils.logErr(err));

}



restoreAllFromLocal() {
	let pathToDumps = path.resolve(__dirname, '../dump');
	Utils.dirList(pathToDumps).then((result) => {
		console.log(result);
		result.forEach((item) => {
			let pathToDump = path.resolve(__dirname, `../dump/${item}`);
			Utils.dirList(pathToDump).then((result) => {
				let pathToLastFile = Utils.lastedFile(result);
				let pathToDump = path.resolve(__dirname, `../dump/${item}/${pathToLastFile}/${item}`);
				restoreDb(item, pathToDump);
			}).catch(err => console.log(err));
		});
	}).catch(err => console.log(err));
}

restoreSpecificDumpFromLocal(paramsObj) {
	let { db, specific } = paramsObj;
	let pathToDump = path.resolve(__dirname, `../dump/${db}/${specific}/${db}`);
	restoreDb(db, pathToDump);
}



removeDb(dbName) {
	sicro.remove(dbName)
		.then(() => {
			sicro.status();
		});
}

status() {
	sicro.status();
}
}


function addSicro(task, description) {
	sicro.add(task, description)
		.then(() => {
			sicro.status();
		})
		.catch((e) => {
			Utils.logErr(err);
		});
}

function mongoDump(db, dumpDir) {
	return new Promise((res, rej) => {
		exec(`mongodump --db ${db} --out ${dumpDir}`, (err, stdout, stderr) => {
			if (err) {
				Utils.logErr(err);
				rej(err);
				// throw err;
			}
			Utils.logOut(stdout);
			Utils.logOut(stderr);
			res();
		});
	});
}



function restoreDb(dbName, pathToDb) {
	exec(`mongorestore --db ${dbName} --drop ${pathToDb}`, (err, stdout, stderr) => {
		if (err) {
			Utils.logErr(err);
			throw err
		};
		Utils.logErr(stderr);
		Utils.logOut(stdout);
		let pathToDir = path.resolve(__dirname, `../restore/${dbName}`);
		Utils.removeDir(pathToDir);
	});
}


module.exports = MongoManager;