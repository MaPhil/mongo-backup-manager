const fs = require('fs');
const del = require('del');
const path = require('path');
const winston = require('winston');

const infoLog = path.resolve(__dirname, './info.log');
const errLog = path.resolve(__dirname, './err.log');

const logger = new(winston.Logger)({
  transports: [
        new(winston.transports.Console)(),
        new(winston.transports.File)({
      json: false,
      filename: infoLog
    })
    ]
});

const errlog = new(winston.Logger)({
  transports: [
        new(winston.transports.Console)(),
        new(winston.transports.File)({
      json: false,
      filename: errLog
    })
    ]
});



class Utils {
  static formDate() {
    let date = new Date();
    return `+${date.toISOString()}`;
  }

  static parseDumpDate(dumpWithDate) {
    return dumpWithDate.replace(/[+].+?[.].+?[.]/, '.');
  }

  static createDir(dirName) {
    return new Promise((res, rej) => {
      fs.exists(dirName, (result) => {

        if (!result) {
          fs.mkdir(dirName, (err) => {
            if (err) rej(err);
          });
        }
        res(dirName);
      });
    });

  }

  static removeDir(dirName) {
    del(dirName, {
      force: true
    }).catch(err => console.log(err));
  }

  static removeFile(file) {
    del(file, {
      force: true
    }).catch(err => console.log(err));
  }

  static dirList(dir) {
    return new Promise((res, rej) => {
      fs.readdir(dir, (err, files) => {
        if (err) rej(err);
        res(files);
      });
    });

  }

  static lastedFile(files) {
    return files[files.length - 1];
  }

  static logOut(data) {
    if (data) {
      logger.log('info', data);
    }
  }

  static logErr(data) {
    if (data) {
      errlog.log('error', data);
    }
  }

  static checkSchedule(value) {
    if (value && value.length >= 9) {
      return true;
    }
    return false;
  }


}


module.exports = Utils;
