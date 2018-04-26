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
				if (err) {
					Utils.logErr(err);
					throw err
				};
				let dumps = null;
				if (result) {
					dumps = result.map(item => item.name);
				}
				console.log(dumps);
				client.end();
			});
		});
		client.on('error', (err) => {
			Utils.logErr(err);
		});
		client.connect(this.connectParams);
	}

	getLastDumpRemote(dumpDir) {

		return new Promise((res, rej) => {
			let client = new Client();
			let dirWithDumpFile = dumpDir || '';
			client.on('ready', () => {
				client.list(`./${dirWithDumpFile}`, (err, result) => {
					if (err) {
						Utils.logErr(err);
						throw err;
					}
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
				Utils.logErr(err);
				rej(err);
			});
			client.connect(this.connectParams);
		});

	}


	putToRemote(dbDirPath, dbTimeName, dbName, folder) {
		
		if(!dbName){
			dbName = folder;
		}
	
		return new Promise((res, rej) => {
			let dumpGz = `${dbDirPath}.tar.gz`;
			let dumpName = `${dbTimeName}.tar.gz`;
			let connectParams = this.connectParams;
			targz.compress({
				src: dbDirPath,
				dest: dumpGz
			}, function (err) {
				if (err) {
					Utils.logErr(err);
				} else {
					putFilesFtp(connectParams, dumpGz, dumpName, dbName, folder).then(() => {
						res();
					}).catch((err) => {
						rej(err);
					});
				}
			});
		});

	}



	returnAllDumpsRemote() {
	
		return new Promise((res, rej) => {
			let client = new Client();
			client.on('ready', () => {
				client.list((err, result) => {
					if (err) {
						rej(err);
					}
					let dumps = null;
					if (result) {
						dumps = result.map(item => item.name);
					}
					res(dumps);

					client.end();
				});
			});
			client.on('error', (err) => {
				Utils.logErr(err);
			});
			client.connect(this.connectParams);
		});
	}

	getFromRemote(db, dumpfile) {

		return new Promise((resolve, reject) => {
			let client = new Client();
			let dbArhive = `${db}/${dumpfile}`;
			let pathToRestoreFolder = path.resolve(__dirname, `../restore/${dbArhive}`);
			let pathToRestoredFile = path.resolve(__dirname, `../restore/`);

			Utils.createDir(pathToRestoredFile + `/${db}`).then((result) => {
				client.on('ready', () => {
					client.get(dbArhive, (err, stream) => {
						if (err) {
							console.log(err);
							reject(err);
						}

						stream.once('close', function () {
							client.end();
						});

						stream.pipe(fs.createWriteStream(pathToRestoreFolder));
					});
				});

				client.on('error', (err) => {
					Utils.logErr(err);
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
            console.log(pathToRestorArhive);
			Utils.removeFile(pathToRestorArhive);
			pathToRestoredFile = path.resolve(pathToRestoredFile, `./${db}`);
			resolve(pathToRestoredFile);
		}
	});
}



function putFilesFtp(connectParams, dbDirPath, dumpName, dirName, folder) {
	return new Promise((res, rej) => {
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
					client.mkdir(dirName,true, (err) => {
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
            if(folder && folder !='') dirName = dirName.substring(folder.length+1, dirName.length);
			Utils.removeDir(path.resolve(__dirname, `../temp/${dirName}`));
			res();
		});
		client.on('error', (err) => {
			Utils.logErr(err);
			Utils.removeFile(dbDirPath);
            if(folder && folder !='') dirName = dirName.substring(folder.length+1, dirName.length);
			Utils.removeDir(path.resolve(__dirname, `../temp/${dirName}`));
			rej(err);
		});
		client.connect(connectParams);
	});
}

module.exports = FtpClient;