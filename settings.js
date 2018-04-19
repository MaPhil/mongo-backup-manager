const q = require('q');
const fs = require('fs');
const whereis = require("node-whereis");
const path = require('./path')

module.exports.storePath = function () {
  var defer = q.defer();
  if (path.first) {
    var t = {
      mongodump: whereis('mongodump'),
      mongorestore: whereis('mongorestore')
    };


    fs.writeFile(__dirname + '/path.js', `
module.exports.first = false;
module.exports.mongodumpPath = '${t.mongodump}';
module.exports.mongorestorePath = '${t.mongorestore}';
`, (err) => {
      defer.resolve();
    });
  } else defer.resovle();
  return defer.promise;
}
