const sicro = require('sicro');
const exec = require('child_process').exec;
const path = require('path');
const Utils = require('../utils');
const pathSetting = require('../path');



const Ftp = require('../ftp/index.js');



class MongoManager {
  constructor() {}

  dumpToRemote(paramsObj) {
    let {
      db,
      host,
      port,
      user,
      password,
      schedule,
      folder
    } = paramsObj;
    if (schedule) {
      if (!Utils.checkSchedule(schedule)) {
        console.log('Bad param to sicro, for more info visit http://www.nncron.ru/help/EN/working/cron-format.htm');
        return;
      }
    }
    let dbWithTimeDump;
    let pathToTemp;

    if (folder && folder != '') {
      pathToTemp = path.resolve(__dirname, `../temp/${folder}`)
      dbWithTimeDump = folder + Utils.formDate();
    } else {
      pathToTemp = path.resolve(__dirname, `../temp/${db}`);
      dbWithTimeDump = db + Utils.formDate();
    }

    Utils.createDir(pathToTemp).then(() => {

      mongoDump(db, pathToTemp).then(() => {
        let ftp = new Ftp(paramsObj);
        let dumpPath = `${pathToTemp}`;
        Utils.createDir(dumpPath).then(() => {
          ftp.putToRemote(dumpPath, dbWithTimeDump, db, folder).then(() => {
            if (schedule) {
              let pathToMain = path.resolve(__dirname, '../index.js');
              let sicroDescription;

              if (folder && folder != '') {
                sicroDescription = `${schedule} ${process.execPath} ${pathToMain} --dump remote --folder ${folder} --host ${host}  --port ${port} --user ${user} --password ${password}`;

                addSicro(folder, sicroDescription);
              } else {
                sicroDescription = `${schedule} ${process.execPath} ${pathToMain} --dump remote --db ${db} --host ${host}  --port ${port} --user ${user} --password ${password}`;
                addSicro(db, sicroDescription);
              }
            }
          }).catch((err) => {
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
    let {db, folder} = paramsObj;
    let ftp = new Ftp(paramsObj);
    let dumpDir ='';
    if(folder && folder != ''){
      dumpDir = folder;
    } else if (db && db != ''){
      dumpDir = db;
    }
    ftp.getDumpList(dumpDir);
  }

  getLocalListWithDump(paramsObj) {
    let {
      db
    } = paramsObj;
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
    let {
      db,
      schedule,
      folder
    } = paramsObj;
    if (schedule) {
      if (!Utils.checkSchedule(schedule)) {
        console.log('Bad param to sicro, for more info visit http://www.nncron.ru/help/EN/working/cron-format.htm');
        return;
      }
    }
    let dumpTimeDir = db + Utils.formDate();
    let dumpDir;
    if (folder && folder != '') {
      let folderTimeDir = folder + Utils.formDate();
      dumpDir = path.resolve(__dirname, `../dump/${folder}/${folderTimeDir}`);
    } else if (db && db != '') {
      dumpDir = path.resolve(__dirname, `../dump/${db}/${dumpTimeDir}`)
    };

    Utils.createDir(dumpDir).then((dumpDir) => {

      mongoDump(db, dumpDir).then(() => {
        if (schedule) {

          let pathToMain = path.resolve(__dirname, '../index.js');
          let sicroDescription;
          if (folder && folder != '') {
            sicroDescription = `${schedule} ${process.execPath} ${pathToMain} --dump local --folder ${folder}`;
            addSicro(folder, sicroDescription);

          } else {
            let sicroDescription = `${schedule} ${process.execPath} ${pathToMain} --dump local --db ${db}`;
            addSicro(db, sicroDescription);
          }
        }
      }).catch((err) => {
        Utils.logErr(err);
      });
    }).catch((err) => {
      Utils.logErr(err);
    });

  }

  restoreDbFromRemote(paramsObj) {
    console.log('paramsObj ', paramsObj);
    let {
      db,
      folder
    } = paramsObj;
    let dump;
    if (folder && folder != '') {
      dump = folder;
    } else {
      dump = db;
    }
    let ftp = new Ftp(paramsObj);
    ftp.getLastDumpRemote(dump).then((result) => {
      ftp.getFromRemote(dump, result).then((_path) => {
        if (folder && folder != '') {
          let pathToRestoreDir = path.resolve(__dirname, '../restore');
          restoreDb('', pathToRestoreDir);
        } else {
          restoreDb(dump, _path);
        }
      }).catch((err) => {
        Utils.logErr(err);
      });
    }).catch((err) => {
      Utils.logErr(err);
    });

  }

  restoreSpecificFromRemote(paramsObj) {
    let ftp = new Ftp(paramsObj);
    let {
      db,
      specific,
      folder
    } = paramsObj;
    let dump;
    if(folder && folder != ''){
      dump = folder;
    } else {
      dump = db;
    }
    ftp.getFromRemote(dump, specific).then((_path) => {
      if(folder && folder != ''){
        let pathToRestore = path.resolve(__dirname, '../restore');;
        restoreDb('', pathToRestore);
      } else {
        restoreDb(dump, _path);
      }
    }).catch(err => Utils.logErr(err));
  }

  /**
   * TODO remove
   * @param {} paramsObj 
   */
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
    let {
      db,
      folder
    } = paramsObj;

    let pathToDir;
    if (folder && folder != '') {
      pathToDir = path.resolve(__dirname, `../dump/${folder}`)
    } else if (db && db != '') {
      pathToDir = path.resolve(__dirname, `../dump/${db}`);
    }

    console.log(pathToDir);
    Utils.dirList(pathToDir).then((result) => {
      let pathToLastFile = Utils.lastedFile(result);
      let pathToDump;
      if (folder && folder != '') {
        pathToDump = path.resolve(__dirname, `../dump/${folder}/${pathToLastFile}`);
      } else {
        pathToDump = path.resolve(__dirname, `../dump/${db}/${pathToLastFile}/${db}`);
      }
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
    let {
      db,
      specific,
      folder
    } = paramsObj;
    let pathToDump;
    if (folder && folder != '') {
      pathToDump = path.resolve(__dirname, `../dump/${folder}/${specific}`)
      restoreDb('', pathToDump)
    } else {
      pathToDump = path.resolve(__dirname, `../dump/${db}/${specific}/${db}`);
      restoreDb(db, pathToDump);
    }
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
    if (pathSetting.first) pathSetting.mongodumpPath = 'mongodump';
    if (!db || db == '') db = '';
    else db = `--db ${db} `;
    exec(`${pathSetting.mongodumpPath} ${db}--out ${dumpDir}`, (err, stdout, stderr) => {
      if (err) {
        Utils.logErr(err);
        rej(err);
      }
      Utils.logOut(stdout);
      Utils.logOut(stderr);
      res();
    });
  });
}



function restoreDb(dbName, pathToDb) {

  if (pathSetting.first) pathSetting.mongorestorePath = 'mongorestore';
  if (dbName && dbName != '') {
    exec(`${pathSetting.mongorestorePath} --db ${dbName} --drop ${pathToDb}`, (err, stdout, stderr) => {
      if (err) {
        Utils.logErr(err);
        throw err
      };
      Utils.logErr(stderr);
      Utils.logOut(stdout);
      let pathToDir = path.resolve(__dirname, `../restore/${dbName}`);
      Utils.removeDir(pathToDir);
    });
  } else {
    exec(`${pathSetting.mongorestorePath}  ${pathToDb}`, (err, stdout, stderr) => {
      if (err) {
        console.log('error here');;
        Utils.logErr(err);
        throw err
      };
      Utils.logErr(stderr);
      Utils.logOut(stdout);
      let pathToDir = path.resolve(__dirname, `../restore`);
      Utils.dirList(pathToDir).then((result) => {
        result.forEach((item) => {
          Utils.removeDir(pathToDir + `/${item}`);
        })
      });
    });
  }
}


module.exports = MongoManager;