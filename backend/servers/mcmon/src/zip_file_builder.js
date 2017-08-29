const Promise = require("bluebird");
const fsa = Promise.promisifyAll(require("fs"));
const rimraf = require('rimraf');
const achiver = require('archiver');
const r = require('./r');

const zipFileUtils = require('../../../servers/lib/zipFileUtils');

const mkdirpAsync = Promise.promisify(require('mkdirp'));

const pathForFileInZip = "Dataset/";

function* publishDatasetZipFile(r, datasetId) {
    try {
        console.log("zip", datasetId);
        let ds = yield r.db('materialscommons').table('datasets').get(datasetId);
        let zipDirPath = zipFileUtils.zipDirPath(ds);
        let zipFileName = zipFileUtils.zipFilename(ds);
        let fillPathAndFilename = zipFileUtils.fullPathAndFilename(ds);

        console.log("full path and filename: ", fillPathAndFilename);

        let ds2dfEntries = yield r.db('materialscommons').table('dataset2datafile')
            .getAll(datasetId, {index: 'dataset_id'}).coerceTo('array');

        if (!ds2dfEntries.length) {
            console.log('no datafiles, no zip for id = ' + datasetId);
            return new Promise(function (resolve, reject) {
                resolve()
            });
        }

        yield mkdirpAsync(zipDirPath);

        let datafileIds = ds2dfEntries.map(entry => entry.datafile_id);
        let datafiles = yield r.table('datafiles').getAll(r.args(datafileIds))
            .merge((df) => {
                return {
                    dir: r.table('datadir2datafile').getAll(df('id'), {index: 'datafile_id'})
                        .eqJoin('datadir_id', r.table('datadirs')).zip().coerceTo('array')
                }
            });
        let nameSourceList = [];
        var seenThisOne = {};

        for (var i = 0; i < datafiles.length; i++) {
            let df = datafiles[i];

            let zipEntry = zipFileUtils.zipEntry(df); // sets fileName, checksum, filePath, sourcePath
            let filePath = zipEntry.filePath;
            let path = zipEntry.sourcePath;
            let name = zipEntry.fileName;

            console.log('-------------');
            console.log('name = ', name);
            console.log('filePath = ', filePath);
            console.log('sourcePath = ', path);
            console.log('name = ',name);

            let checksum = zipEntry.checksum;
            name = resolveZipfileFilenameDuplicates(seenThisOne, name, checksum);
            let stream = fsa.createReadStream(path, {
                flags: 'r',
                encoding: null,
                fd: null,
                mode: 0o666,
                autoClose: true
            });
            nameSourceList.push({name: name, path: filePath, source: stream});
        }

        console.log("For id = " + datasetId + ", there are " + nameSourceList.length + " files");

        var output = fsa.createWriteStream(fillPathAndFilename);

        let retP = new Promise(function (resolve, reject) {
            var archive = achiver('zip');

            output.on('close', function () {
                let zipfileSize = archive.pointer();
                console.log('for dataset: ' + datasetId + " with " + zipfileSize + ' total bytes');
                let zip = {size: zipfileSize, filename: zipFileName};
                r.db('materialscommons').table('datasets').get(datasetId).update({zip: zip}).then(() => {
                    console.log("Dataset zipfile set:", zipFileName,"Process done.")
                    resolve();
                });
            });

            archive.on('error', reject);

            archive.on('close', function () {
                console.log('archive close');
            });

            archive.pipe(output);

            nameSourceList.forEach(ns => {
                let pathAndName = pathForFileInZip + ns.path + ns.name;
                archive.append(ns.source, {name: pathAndName});
            });

            archive.finalize();
        });

        console.log("Starting of zip file For id = " + datasetId + "... (wait)");

        return retP;

    } catch (error) {
        return yield Promise.reject("Error in publishDatasetZipFile: " + error.message);
    }
}

function* unpublishDatasetZipFile(r, datasetId) {
    try {
        console.log("delete zip for datasetid =", datasetId);
        let ds = yield r.db('materialscommons').table('datasets').get(datasetId);
        let zipDirPath = zipFileUtils.zipDirPath(ds);
        let zipFileName = zipFileUtils.zipFilename(ds);
        let fillPathAndFilename = zipFileUtils.fullPathAndFilename(ds);

        yield fsa.unlinkAsync(fillPathAndFilename);

        console.log("Deleted ", fillPathAndFilename);

        rimraf.sync(zipDirPath);
        console.log("Deleted ", zipDirPath);

    } catch (error) {
        return yield Promise.reject("Error in unpublishDatasetZipFile: " + error.message);
    }
}

function resolveZipfileFilenameDuplicates(seenThisOne, name, checksum) {
    name = name.toLowerCase();

    if (name.startsWith(".")) {
        name = "dot_" + name;
    }

    if (name in seenThisOne) {
        var count = 0;
        if (seenThisOne[name] == checksum) {
            console.log("Seen this file before: " + name);
            return null;
        } else {
            let newName = resolveZipfileFilenameUnique(name, count);
            while (newName in seenThisOne) {
                count++;
                newName = resolveZipfileFilenameUnique(name, count);
            }
            // console.log(name + " --> " + newName);
            name = newName;
        }
    }
    seenThisOne[name] = checksum;
    return name;
}

function resolveZipfileFilenameUnique(name, count) {
    let parts = path.parse(name);
    return parts.name + "_" + count + parts.ext;
}

function build_zip_file(datasetId) {
    Promise.coroutine(publishDatasetZipFile)(r,datasetId);
}

function remote_zip_file(datasetId){
    Promise.coroutine(unpublishDatasetZipFile)(r,datasetId);
}

module.exports = {
    build_zip_file,
    remote_zip_file
};
