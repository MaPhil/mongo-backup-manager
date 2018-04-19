const q = require('q');
const fs = require('fs');
const whereis = require("node-whereis");

module.exports.storePath = function () {
  var defer = q.defer();
  var t = {
    mongodump: whereis('mongodump'),
    mongorestore:whereis('mongorestore')
  };
  
  
  fs.writeFile('path.js', `
module.exports.mongodumpPath = '${t.mongodump}';
module.exports.mongorestorePath = '${t.mongorestore}';
`, (err) => {  
    defer.resolve();
  });
  return defer.promise;
}