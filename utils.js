const fs = require('fs');
const del = require('del');


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
        del(dirName).catch(err => {
            console.log(err);
        });
    }

    static removeFile(file) {
        del(file).catch(err => console.log(err));
    }

    static dirList(dir) {
        return new Promise((res, rej) => {
            fs.readdir(dir, (err, files) => {
                if(err) rej(err);
                res(files);
            });
        });
        
    }

    static lastedFile(files) {
        return files[files.length - 1];
    }

}


module.exports = Utils;
