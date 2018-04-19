#!/usr/bin/env node

const pjson = require('./package.json');
const minimist = require('minimist');

const argv = minimist(process.argv.slice(2), {
  alias: {
    'list': 'l',
    'db': 'd',
    'host': 'hst',
    'port': 'prt',
    'user': 'usr',
    'password': 'pwd',
    'schedule': 'schdl',
    'restore': 'rstr',
    'specific': 'spcfc',
    'dbs': 'ds',
    'all': 'a',
    'remove': 'rm',
    'status': 'stts',
    'dump': 'dmp',
    'help': 'h',
    'version': 'v',
    'init': 'i'
  },
  unknown: (arg) => {
    console.error('Unknown option: ', arg)
    return false;
  }
});


const MongoManager = require('./mongodb/mongodb.js');

const settings = require('./settings');

const mongoManeger = new MongoManager();
const help = `mongo-backup-manager \n
generel option : 
\t-v --version
\t-h --help

functions:
\tdump list remote:
\t\t[--list remote] [--db] <dbname> [--host] <host> [--port] <port> [--user] <user> [--password] <password>
\tdump list local 
\t\t[--list local] [--db] <dbname>
\tdump to remote storage:
\t\t[--dump remote]  [--db] <db> [--host] <host> [--port] <port> [--user] <user> [--password] <password> [--schedule] <'* * * * *'>
\tdump to local:
\t\t[--dump local] [--db] <db> [--schedule] <'* * * * *'>
\trestore from remote:
\t\t[--restore remote]  [--db] <db> [--specific] <dumpName> [--host] <host> [--port] <port> [--user] <user> [--password] <password>
\trestore all from remote
\t\t[--restore remote] [--dbs all] [--host] <host> [--port] <port> [--user] <user> [--password] <password>
\trestore from local:
\t\t[--restore local]  [--db] <db> [--dbs all] [--specific] <dumpName>
\tremove db:
\t\t[--remove]  <dbname>
\tstatus:
\t\t[--status]
`;

if (argv.v || argv.version) {
  console.log(pjson.version);
}

if (argv.h || argv.help) {
  console.log(help);
}
if (argv.i || argv.init) {
  settings.storePath().then(function () {
    console.log('stored path');
  })
}
if (argv.list && argv.list === 'remote') {

  mongoManeger.getRemoteListWithDump(argv);
}


if (argv.list && argv.list === 'local') {
  mongoManeger.getLocalListWithDump(argv);
}

if (argv.dump && argv.dump === 'remote') {

  settings.storePath().then(function () {
    mongoManeger.dumpToRemote(argv);
  })
}

if (argv.dump && argv.dump === 'local') {

  settings.storePath().then(function () {
    mongoManeger.dumpToLocal(argv);
  })
}

if (argv.restore && argv.restore === 'remote') {

  settings.storePath().then(function () {
    if (argv.specific && argv.specific !== '') {
      mongoManeger.restoreSpecificFromRemote(argv);
    } else if (argv.dbs && argv.dbs === 'all') {
      console.log('ALL');
      mongoManeger.restoreAllFromRemote(argv);
    } else {
      mongoManeger.restoreDbFromRemote(argv);
    }
  })
}

if (argv.restore && argv.restore === 'local') {

  settings.storePath().then(function () {
    if (argv.dbs && argv.dbs === 'all') {
      mongoManeger.restoreAllFromLocal();
    } else if (argv.specific && argv.specific !== '') {
      mongoManeger.restoreSpecificDumpFromLocal(argv);
    } else {
      mongoManeger.restoreFromLocal(argv);
    }
  })
}

if (argv.add && argv.add !== '') {
  let dbName = argv.add;
  let schedule = null;
  if (argv.schedule && argv.schedule !== '') {
    schedule = argv.schedule;
  }

  mongoManeger.addDb(dbName, schedule);

}

if (argv.remove && argv.remove !== '') {
  let dbName = argv.remove;
  mongoManeger.removeDb(dbName);

}


if (argv.status) {
  mongoManeger.status();
}
