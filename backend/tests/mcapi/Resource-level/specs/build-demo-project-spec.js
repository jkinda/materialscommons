'use strict';
require('mocha');
require('co-mocha');
const chai = require('chai');
const assert = require('chai').assert;
const fs = require('fs');
const os = require('os')
const execSync = require('child_process').execSync;
const exec = require('child_process').exec;


const r = require('rethinkdbdash')({
    db: process.env.MCDB || 'materialscommons',
    port: process.env.MCDB_PORT || 30815
});

const backend_base = '../../../..';
const dbModelUsers = require(backend_base + '/servers/mcapi/db/model/users');
const projects = require(backend_base + '/servers/mcapi/db/model/projects');
const directories = require(backend_base + '/servers/mcapi/db/model/directories');
const apikeyCache = require(backend_base + '/servers/lib/apikey-cache')(dbModelUsers);

const base_user_id = 'thisIsAUserForTestingONLY!';
const fullname = "Test User";
const base_project_name = "Test project - test 1: ";
const user_apikey = "ThisIsAJunkKey";
const user1Id = "mctest@mc.org";

before(function*() {
    let user = yield dbModelUsers.getUser(user1Id);
    if (!user) {
        let results = yield r.db('materialscommons').table('users').insert({
            admin: false,
            affiliation: "",
            avatar: "",
            description: "",
            email: user1Id,
            apikey: user_apikey,
            fullname: fullname,
            homepage: "",
            id: user1Id,
            name: fullname,
            preferences: {
                tags: [],
                templates: []
            }
        });
        assert.equal(results.inserted, 1, "The User was correctly inserted");
    } else {
        assert.equal(user.id,user1Id, "Wrong test user, id = " + user.id);
    }
});

describe('Feature - User - Build Demo Project: ', function() {
    describe('User for test',function() {
        it('exists', function * (){
            let user = yield dbModelUsers.getUser(user1Id);
            assert.isNotNull(user,"test user exists");
            assert.equal(user.id,user1Id);
            assert.equal(user.name,fullname);
        })
    });
    describe('Datafile directory for test',function() {
        it('exists', function *() {
            let filenames = [
                'LIFT Specimen Die.jpg',
                'L124_photo.jpg',
                'LIFT HPDC Samplesv3.xlsx',
                'Measured Compositions_EzCast_Lift380.pptx',
                'GSD_Results_L124_MC.xlsx',
                'Grain_Size_EBSD_L380_comp_5mm.tiff',
                'Grain_Size_EBSD_L380_comp_core.tiff',
                'Grain_Size_EBSD_L380_comp_skin.tiff',
                'Grain_Size_Vs_Distance.tiff',
                'L124_plate_5mm_TT_GF2.txt',
                'L124_plate_5mm_TT_IPF.tif',
                'EPMA_Analysis_L124_Al.tiff',
                'EPMA_Analysis_L124_Cu.tiff',
                'EPMA_Analysis_L124_Si.tiff',
                'ExperimentData_Lift380_L124_20161227.docx',
                'Samples_Lift380_L124_20161227.xlsx'
            ];
            let base_dir = process.env.MCDIR + "/project_demo/";
            let datapath = base_dir + "files";
            assert(fs.existsSync(datapath));
            for (var i = 0; i < filenames.length; i++) {
                let filename = filenames[i];
                let path = `${datapath}/${filename}`;
                assert(fs.existsSync(path), "missing test datafile " + filename);
            }
        });
    });
    describe('Run build demo script command with args',function() {
        it('Build demo project ', function* () {
            this.timeout(10000); // 10 seconds
            let apikey = user_apikey;

            //let result = createDemoProjectSync(apikey);
            let result = yield createDemoProjectAsync(apikey);
            console.log(result);
            //assert.equal(result,"Refreshed project with name = Demo Project")
        })
    });
});

function createDemoProjectSync (apikey) {
    let port = process.env.MCDB_PORT,
        hostname = os.hostname(),
        mcdir = process.env.MCDIR,
        apihost = '',
        source_dir = `${mcdir}/project_demo/python`;

    switch (hostname) {
        case 'materialscommons':
            apihost = port === '30815' ? 'test.materialscommons.org' : 'materialscommons.org';
            break;
        case 'lift.miserver.it.umich.edu':
            apihost = 'lift.materialscommons.org';
            break;
        default:
            apihost = 'mctest.localhost';
            break;
    }

    let host_string = `http://${apihost}/`;
    let command1 = `cd ${source_dir}`;
    let command2 = `python build_project.py --host ${host_string} --apikey ${apikey} --datapath ${mcdir}/project_demo/files`;
    let results_buf = execSync(`${command1} ; ${command2}`);
    return results_buf.toString();
}

function* createDemoProjectAsync(apikey) {
    let port = process.env.MCDB_PORT,
        hostname = os.hostname(),
        mcdir = process.env.MCDIR,
        apihost = '',
        source_dir = `${mcdir}/project_demo/python`;

    switch (hostname) {
        case 'materialscommons':
            apihost = port === '30815' ? 'test.materialscommons.org' : 'materialscommons.org';
            break;
        case 'lift.miserver.it.umich.edu':
            apihost = 'lift.materialscommons.org';
            break;
        default:
            apihost = 'mctest.localhost';
            break;
    }

    let host_string = `http://${apihost}/`;
    let command1 = `cd ${source_dir}`;
    let command2 = `python build_project.py --host ${host_string} --apikey ${apikey} --datapath ${mcdir}/project_demo/files`;
    let result = '';
    try {
        let childProcess = exec(`${command1} ; ${command2}`);
        yield promiseFromChildProcess(childProcess);
        result = {status: 'Demo project setup'}
    } catch (err) {
        console.log(err)
        result = {error: 'Failed to create demo project'};
    }
    return result;
}

function promiseFromChildProcess(child) {
    return new Promise(function (resolve, reject) {
        child.addListener("error", reject);
        child.addListener("exit", (exitCode) => {
            if (exitCode !== 0) {
                reject();
            } else {
                resolve()
            }
        });
    });
}

/*
Notes:
 let cp = exec(something, (error, stdout, stderr) => {
 console.log(stdout);
 console.log(stderr);

 })

 resultsbuf = "";
 (error, stdout, stderr) { resultsbuf = stdout;}
 return resultsbuf;


 cp.stderr.on('data', (data) => resultsbuf += data)

 let p = new Promise()
 exec(something, (error, stdout, stderr) => {
 if (error) {
 p.reject();
 } else {
 p.resolve();
 }
 });
 yield p;


 */
