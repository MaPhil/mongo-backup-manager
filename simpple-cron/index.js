'use strict';

var fs = require('fs');
var _q = require('q');
const { exec } = require('child_process');

var Table = require('cli-table');
var printtable = new Table({
  head: ["SIMPLE-CRON ID", "Job"]
});


var startToken = '#++++start-';
var endToken = '\n#++++end-';
var regex = new RegExp(/\#\+\+\+\+start\-[\s\S]*\#\+\+\+\+end\-/mg);

//low level to replace functionality  after testing
var loWrite = function (data) {
  var q = _q.defer();
  exec(`echo "${data}" | crontab -`, (err, stdout, stderr) => {
    if (err) q.reject(err);
    if(stdout)q.resolve(stdout);
    else q.resolve(stderr);
  });
  return q.promise;
};
var loRead = function () {
  var q = _q.defer();
  exec(`crontab -l`, (err, stdout, stderr) => {
    if(err)q.reject(err);
    if(stdout){
      q.resolve(stdout);
    }else{
      q.resolve(stderr);
    }
  });
  return q.promise;
};

//util functions
var write = function (values) {
  var q = _q.defer();
  loRead().then(function (data) {
    var enter = '';
    for (var key in values) {
      if (values.hasOwnProperty(key)) {
        enter += '\n#' + key + '\n' + values[key];
      }
    }
    if (!data || data === ''){
      data = startToken + enter + endToken;
    }else if (data.split(regex).length > 1) {
      data =  data.replace(regex, startToken +enter+ endToken);
    }else{
      data +='\n' + startToken + enter + endToken;
    }
    loWrite(data).then(function () {
      q.resolve();
    });
  });
  return q.promise;
}
var read = function () {
  var q = _q.defer();
  loRead().then(function (data) {

    var lines = regex.exec(data);
    var out = {};
    if (lines) {
      lines = lines[0];
      lines = lines.split('\n');
      for (var i = 1; i < lines.length - 1; i += 2) {
        out[lines[i].substr(1)] = lines[i + 1];
      }
    }
    q.resolve(out);
  });
  return q.promise;
}

//test functions
module.exports.create = function () {
  var q  = _q.defer();
  var t = `asdfas\dfas\ndf\n${startToken}\n#asdf\naldsjf${endToken}\nameljaksd\nflkjasdf`;
  fs.writeFile("temp.txt", t, function (err) {
    q.resolve();
  });
  return q.promise;
};


//real functions

module.exports.remove = function (key) {
  var q = _q.defer();
  read().then(function (data) {
    var size = Object.keys(data).length;
    delete data[key];
    write(data).then(function () {
      q.resolve();
    });
  });
  return q.promise;
};
module.exports.add = function (key, command) {
  console.log(command);
  var q = _q.defer();
  read().then(function (data) {
    data[key] = command;
    write(data).then(function () {
      q.resolve();
    });
  });
  return q.promise;
};


module.exports.status = function () {
  var q = _q.defer();
  read().then(function (a) {
    for (var key in a) {
      if (a.hasOwnProperty(key)) {
        printtable.push([key, a[key]]);
      }
    }
    console.log(printtable.toString());
    q.resolve();
  });
  return q.promise;
}
