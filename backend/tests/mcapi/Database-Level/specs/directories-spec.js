'use strict';

//module.exports = {
//    update: update,
//    remove
//};

require('mocha');
require('co-mocha');
const chai = require('chai');
const assert = require('chai').assert;

const r = require('rethinkdbdash')({
    db: process.env.MCDB || 'materialscommons',
    port: process.env.MCDB_PORT || 30815
});

const backend_base = '../../../..';
const dbModelUsers = require(backend_base + '/servers/mcapi/db/model/users');
const projects = require(backend_base + '/servers/mcapi/db/model/projects');
const directories = require(backend_base + '/servers/mcapi/db/model/directories');

const base_user_id = 'thisIsAUserForTestingONLY!';
const fullname = "Test User";
const base_project_name = "Test project - test 1: ";

let random_name = function(){
    let number = Math.floor(Math.random()*10000);
    return base_project_name + number;
};

let random_user = function(){
    let number = Math.floor(Math.random()*10000);
    return base_user_id + number + "@mc.org";
};

let user1Id = random_user();

before(function*() {
    let user = yield dbModelUsers.getUser(user1Id);
    if (!user) {
        let results = yield r.db('materialscommons').table('users').insert({
            admin: false,
            affiliation: "",
            avatar: "",
            description: "",
            email: user1Id,
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

describe('Feature - directories: ', function() {
    describe('Top level directory', function() {
        it('fetch top level directory from project', function*(){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            assert.isNotNull(user,"test user exists");
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_list = yield projects.forUser(user);
            let found_project = null;
            project_list.forEach(function(p){
                if (p.name == project_name) {
                    found_project = p;
                }
            });
            assert.isNotNull(found_project);
            assert.equal(found_project.otype, "project");
            assert.equal(found_project.owner, user.id);
            assert.equal(found_project.owner, user1Id);
            let project_id = project.id;
            let top_directory =  yield directories.get(project_id,'top');
            assert.equal(top_directory.otype, "directory");
            assert.equal(top_directory.name, found_project.name);
        });
        it('fetch top level directory by id', function*(){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            assert.equal(top_directory.otype, "directory");
            assert.equal(top_directory.name, project.name);
            let directory_id = top_directory.id;
            let directory = yield directories.get(project_id,directory_id);
            assert.equal(top_directory.otype, "directory");
            assert.equal(top_directory.name, project.name);
        });
    });

    describe('Create directory', function() {
        it('create directory path from top directory as /', function*(){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path = 'A1/B1/C1';
            let dir_args = {
              from_dir: from_dir,
              path: path
            };
            let result = yield directories.create(project_id,project_name,dir_args);
            assert.isTrue(result.hasOwnProperty('val'));
            let dir_list = result.val;
            assert.equal(dir_list.length, 3);
            assert.equal(dir_list[0].name,project_name + '/A1');
            assert.equal(dir_list[1].name,project_name + '/A1/B1');
            assert.equal(dir_list[2].name,project_name + '/A1/B1/C1');
        });
        it('create directory path from top directory as id', function*(){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path = 'A1/B1/C1';
            let dir_args = {
                from_dir: top_directory.id,
                path: path
            };
            let result = yield directories.create(project_id,project_name,dir_args);
            assert.isTrue(result.hasOwnProperty('val'));
            let dir_list = result.val;
            assert.equal(dir_list.length, 3);
            assert.equal(dir_list[0].name,project_name + '/A1');
            assert.equal(dir_list[1].name,project_name + '/A1/B1');
            assert.equal(dir_list[2].name,project_name + '/A1/B1/C1');
        });
        it('create directory path from directory as path', function*(){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path = 'A1/B1/C1';
            let dir_args = {
                from_dir: from_dir,
                path: path
            };
            let result = yield directories.create(project_id,project_name,dir_args);
            assert.isTrue(result.hasOwnProperty('val'));
            let dir_list = result.val;
            assert.equal(dir_list.length, 3);
            assert.equal(dir_list[0].name,project_name + '/A1');
            assert.equal(dir_list[1].name,project_name + '/A1/B1');
            assert.equal(dir_list[2].name,project_name + '/A1/B1/C1');
            from_dir = from_dir + path;
            path = "D1/E1";
            dir_args = {
                from_dir: from_dir,
                path: path
            };
            result = yield directories.create(project_id,project_name,dir_args);
            assert.isTrue(result.hasOwnProperty('val'));
            dir_list = result.val;
            assert.equal(dir_list.length, 2);
            assert.equal(dir_list[0].name,project_name + '/A1/B1/C1/D1');
            assert.equal(dir_list[1].name,project_name + '/A1/B1/C1/D1/E1');
        });
    });

    describe('Get directories', function() {
        it('Get all dirs in project and test for empty', function*(){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path = 'A1/B1/C1';
            let dir_args = {
                from_dir: from_dir,
                path: path
            };
            let result = yield directories.create(project_id,project_name,dir_args);
            assert.isTrue(result.hasOwnProperty('val'));
            let dir_list = result.val;
            assert.equal(dir_list.length, 3);
            assert.equal(dir_list[0].name,project_name + '/A1');
            assert.equal(dir_list[1].name,project_name + '/A1/B1');
            assert.equal(dir_list[2].name,project_name + '/A1/B1/C1');
            dir_list = yield directories.getAll(project_id);
            assert.equal(dir_list.length, 4);
            assert.equal(dir_list[0].name,project_name);
            assert.equal(dir_list[1].name,project_name + '/A1');
            assert.equal(dir_list[2].name,project_name + '/A1/B1');
            assert.equal(dir_list[3].name,project_name + '/A1/B1/C1');
            assert.isFalse(yield directories.isEmpty(dir_list[0].id));
            assert.isFalse(yield directories.isEmpty(dir_list[1].id));
            assert.isFalse(yield directories.isEmpty(dir_list[2].id));
            assert.isTrue(yield directories.isEmpty(dir_list[3].id));
        });
        it('Subdir exists and test for empty', function*(){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path = 'A1/B1';
            let dir_args = {
                from_dir: from_dir,
                path: path
            };
            let result = yield directories.create(project_id,project_name,dir_args);
            assert.isTrue(result.hasOwnProperty('val'));
            let dir_list = result.val;
            assert.equal(dir_list.length, 2);
            assert.equal(dir_list[0].name,project_name + '/A1');
            assert.equal(dir_list[1].name,project_name + '/A1/B1');
            let directory = dir_list[0];
            result = yield directories.subdirExists(directory.id,project_name + '/A1/B1');
            let subdir = result[0];
            assert.equal(subdir.name,project_name + '/A1/B1');
            assert.equal(subdir.parent,directory.id);
            assert.isFalse(yield directories.isEmpty(directory.id));
            assert.isTrue(yield directories.isEmpty(subdir.id));
        });
        it('Get sub-directories as peer_directories', function*(){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path1 = 'A1/B1';
            let path2 = 'A1/C1';
            let path3 = 'A1/D1';
            let dir_args1 = {
                from_dir: from_dir,
                path: path1
            };
            let dir_args2 = {
                from_dir: from_dir,
                path: path2
            };
            let dir_args3 = {
                from_dir: from_dir,
                path: path3
            };
            yield directories.create(project_id,project_name,dir_args1);
            yield directories.create(project_id,project_name,dir_args2);
            let result = yield directories.create(project_id,project_name,dir_args3);
            assert.isTrue(result.hasOwnProperty('val'));
            let dir_list = result.val;
            assert.equal(dir_list.length, 2);
            assert.equal(dir_list[0].name,project_name + '/A1');
            assert.equal(dir_list[1].name,project_name + '/A1/D1');
            let directory = dir_list[0];
            let dir_with_subs = yield directories.peerDirectories(directory.id);
            assert.equal(dir_with_subs.name,project_name + '/A1');
            assert.equal(dir_with_subs.name,directory.name);
            assert.equal(dir_with_subs.id,directory.id);
            assert.isTrue(dir_with_subs.hasOwnProperty('peer_directories'));
            let subs = dir_with_subs.peer_directories;
            let expected = [project_name + "/" + path1,
                project_name + "/" + path2, project_name + "/" + path3];
            let missing = [];
            expected.forEach( function(target) {
                let found = false;
                subs.forEach(function(dir){
                    if (dir.name == target) {found = true;}
                });
                if (!found) missing.push(target);
            });
            assert.deepEqual(missing,[],"Should be empty list of missing expected values");
        });
        it("Find in project",function* (){
            // Note dir to find is either a path starting with '/' or an id
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path = 'A1/B1/C1';
            let dir_args = {
                from_dir: from_dir,
                path: path
            };
            let result = yield directories.create(project_id,project_name,dir_args);
            assert.isTrue(result.hasOwnProperty('val'));
            let dir_list = result.val;
            assert.equal(dir_list.length, 3);
            assert.equal(dir_list[0].name,project_name + '/A1');
            assert.equal(dir_list[1].name,project_name + '/A1/B1');
            assert.equal(dir_list[2].name,project_name + '/A1/B1/C1');
            // it appears from the code that case 1 does not work!
            // let dir1 = yield directories.findInProject(project_id,'','/A1/B1');
            let cross = yield directories.findInProject(project_id,'',dir_list[1].id);
            assert.isNotNull(cross);
            assert.equal(cross.length,1);
            assert.equal(cross[0].project_id,project_id);
//            console.log(cross[0].datadir_id);
//            let dir2 = yield directories.get(project_id,cross[0].datadir_id);
//            console.log(dir2.name);
//            assert.equal(dir2.name,project_name + '/A1/B1');
//            assert.isFalse(yield directories.isEmpty(dir2.id));
//            let child1 = dir2.children[0];
//            assert.equal(child1.name,project_name + '/A1/B1/C1');
        });
    });
    describe('Modifiy directories', function() {
        it("Rename dir",function* (){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path = 'A1';
            let dir_args = {
                from_dir: from_dir,
                path: path
            };
            let result = yield directories.create(project_id,project_name,dir_args);
            assert.isTrue(result.hasOwnProperty('val'));
            let dir_list = result.val;
            assert.equal(dir_list.length, 1);
            assert.equal(dir_list[0].name,project_name + '/A1');
            let name = project_name + '/XX';
            let directory_id = dir_list[0].id;
            let rename_args = {
                rename: {
                    new_name: name
                }
            };
            yield directories.update(project_id,directory_id,rename_args);
            let dir = yield directories.get(project_id,directory_id);
            assert.equal(dir.path, name);
        });
        it("Move dir",function* (){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path1 = 'A1/B1';
            let path2 = 'A1/C1';
            let dir_args1 = {
                from_dir: from_dir,
                path: path1
            };
            let dir_args2 = {
                from_dir: from_dir,
                path: path2
            };
            let result = yield directories.create(project_id,project_name,dir_args1);
            let dir_list = result.val;
            assert.equal(dir_list.length, 2);
            assert.equal(dir_list[1].name,project_name + '/A1/B1');
            let dir1_id = dir_list[1].id;
            result = yield directories.create(project_id,project_name,dir_args2);
            dir_list = result.val;
            assert.equal(dir_list.length, 2);
            assert.equal(dir_list[1].name,project_name + '/A1/C1');
            let dir2_id = dir_list[1].id;
            let rename_args = {
                move: {
                    new_directory_id: dir2_id
                }
            };
            ret = yield directories.update(project_id,dir1_id,rename_args);
            let dir3 = ret.val;
            assert.equal(dir3.path,project_name + '/A1/C1/B1');
        });
        it("Delete dir",function* (){
            let user = yield dbModelUsers.getUser(user1Id);
            let project_name = random_name();
            let attrs = {
                name: project_name,
                description: "This is a test project for automated testing."
            };
            let ret = yield projects.createProject(user,attrs);
            let project = ret.val;
            let project_id = project.id;
            let top_directory = yield directories.get(project_id,'top');
            let from_dir = '/';
            let path = 'A1';
            let dir_args = {
                from_dir: from_dir,
                path: path
            };
            let result = yield directories.create(project_id,project_name,dir_args);
            assert.isTrue(result.hasOwnProperty('val'));
            let dir_list = result.val;
            assert.equal(dir_list.length, 1);
            assert.equal(dir_list[0].name,project_name + '/A1');
            let directory_id = dir_list[0].id;
            let dir = yield directories.get(project_id,directory_id);
            assert.isNotNull(dir);
            dir_list = yield directories.getAll(project_id);
            assert.equal(dir_list.length,2);
            ret = yield directories.remove(project_id,directory_id);
            assert.isTrue(ret.val);
            dir_list = yield directories.getAll(project_id);
            assert.equal(dir_list.length,1);
        });
    });
});

after(function*() {
    let user = yield dbModelUsers.getUser(user1Id);
    if (user) {
        let results = yield r.db('materialscommons').table('users').get(user1Id).delete();
        assert.equal(results.deleted,1, "The User was correctly deleted");
    } else {
        assert.isNull(user,"The user still exists at end");
    }
});

