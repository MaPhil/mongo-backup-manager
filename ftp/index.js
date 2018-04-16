const Client = require('ftp');
const fs = require('fs');
const path = require('path');
const targz = require('targz');
const Utils = require('../utils');



class FtpClient {
	constructor(paramsObj) {
		this.connectParams = {
			host: paramsObj.host,
			port: paramsObj.port,
			user: paramsObj.user,
			password: paramsObj.password
		};
	}

	getDumpList(dumpDir) {
		let client = new Client();
		let dirWithDumpFile = dumpDir || '';
		client.on('ready', () => {
			client.list(`./${dirWithDumpFile}`, (err, result) => {
				if (err) throw err;
				let dumps = null;
				if (result) {
					dumps = result.map(item => item.name);
				}
				console.log(dumps);
				client.end();
			});
		});
		client.connect(this.connectParams);
	}

	getLastDumpRemote(dumpDir) {

		return new Promise((res, rej) => {
			let client = new Client();
			let dirWithDumpFile = dumpDir || '';
			client.on('ready', () => {
				client.list(`./${dirWithDumpFile}`, (err, result) => {
					if (err) throw err;
					let dumps = null;
					if (result) {
						dumps = result.map(item => item.name);
					}
					client.end();
					let lastedDump = Utils.lastedFile(dumps);
					res(lastedDump);

				});
			});
			client.on('error', (err) => {
				rej(err);
			});
			client.connect(this.connectParams);
		});

	}


	putToRemote(dbDirPath, dbTimeName, dbName) {
		let dumpGz = `${dbDirPath}.tar.gz`;
		let dumpName = `${dbTimeName}.tar.gz`;
		let connectParams = this.connectParams;

		targz.compress({
			src: dbDirPath,
			dest: dumpGz
		}, function (err) {
			if (err) {
				console.log(err);
			} else {
				putFilesFtp(connectParams, dumpGz, dumpName, dbName);
			}
		});
	}



	returnAllDumpsRemote() {
		return new Promise((res, rej) => {
			let client = new Client();
			client.on('ready', () => {
				client.list((err, result) => {
					if (err) rej(err);
					let dumps = null;
					if (result) {
						dumps = result.map(item => item.name);
					}
					res(dumps);

					client.end();
				});
			});
			client.connect(this.connectParams);
		});
	}

	getFromRemote(db, dumpfile) {
		console.log('get from remote', db);
		return new Promise((resolve, reject) => {
			let client = new Client();
			let dbArhive = `${db}/${dumpfile}`;
			let pathToRestoreFolder = path.resolve(__dirname, `../restore/${dbArhive}`);
			let pathToRestoredFile = path.resolve(__dirname, `../restore/`);

			Utils.createDir(pathToRestoredFile + `/${db}`).then((result) => {
				client.on('ready', () => {
					client.get(dbArhive, (err, stream) => {
						if (err) {
							reject(err);
						}

						stream.once('close', function () {
							client.end();
						});

						stream.pipe(fs.createWriteStream(pathToRestoreFolder));
					});
				});

				client.on('close', () => {
					unpackRestore(db, pathToRestoreFolder, pathToRestoredFile, resolve, reject);
				});

				client.connect(this.connectParams);
			}).catch(err => console.log(err));


		});

	}
}

function unpackRestore(db, pathToRestorArhive, pathToRestoredFile, resolve, reject) {

	targz.decompress({
		src: pathToRestorArhive,
		dest: pathToRestoredFile
	}, function (err) {
		if (err) {
			reject(err);
		} else {
			Utils.removeFile(pathToRestorArhive);
			pathToRestoredFile = path.resolve(pathToRestoredFile, `./${db}`);
			resolve(pathToRestoredFile);
		}
	});
}



function putFilesFtp(connectParams, dbDirPath, dumpName, dirName) {

	let client = new Client();
	client.on('ready', () => {
		client.list((err, result) => {
			if (err) throw err;
			let ifDirExist = result.some(item => item.name === dirName);
			if (ifDirExist) {
				client.put(dbDirPath, `${dirName}/${dumpName}`, (err) => {
					if (err) throw err;
					client.end();
					console.log('ok');
				});
			} else {
				client.mkdir(dirName, (err) => {
					if (err) throw err;
					client.put(dbDirPath, `${dirName}/${dumpName}`, (err) => {
						if (err) throw err;
						console.log('ok');
						client.end();
					});
				});
			}
		});

	});
	client.on('close', () => {
		Utils.removeFile(dbDirPath);
		Utils.removeDir(path.resolve(__dirname, `../temp/${dirName}`));
	});
	client.connect(connectParams);
}








module.exports = FtpClient;
