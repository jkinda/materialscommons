const files = require('../../db/model/files');
const check = require('../../db/model/check');
const parse = require('co-body');
const httpStatus = require('http-status');
const ra = require('../resource-access');

// get retrieves a file.
function* get(next) {
    this.body = yield files.get(this.params.file_id);
    yield next;
}

function* getList(next) {
    let args = yield parse(this);
    this.body = yield files.getList(this.params.project_id, args.file_ids);
    yield next;
}

function* getVersions(next) {
    if (yield check.fileInProject(this.params.file_id, this.params.project_id)) {
        let rv = yield files.getVersions(this.params.file_id);
        if (rv.error) {
            this.status = httpStatus.BAD_REQUEST;
            this.body = rv;
        } else {
            this.body = {versions: rv.val};
        }
    } else {
        this.status = httpStatus.BAD_REQUEST;
        this.body = {error: 'Unknown file'};
    }

    yield next;
}

// put will update certain file fields. To see which fields can be updated look
// at the files.put method.
function* update(next) {
    let file = yield parse(this);
    let rv = yield files.update(this.params.file_id, this.params.project_id, this.reqctx.user.id, file);
    if (rv.error) {
        this.throw(httpStatus.BAD_REQUEST, rv.error);
    }
    this.body = rv.val;
    yield next;
}

// deleteFile will attempt to delete the named file.
function* deleteFile(next) {
    let rv = yield files.deleteFile(this.params.file_id);
    if (rv.error) {
        this.throw(httpStatus.BAD_REQUEST, rv.error);
    }
    this.body = rv.val;
    yield next;
}

function* byPath(next) {
    let args = yield parse(this);
    let rv = yield files.byPath(this.params.project_id, args.file_path);
    if (rv.error) {
        this.throw(httpStatus.BAD_REQUEST, rv.error);
    }
    this.body = rv.val;
    yield next;
}

function createResources(router) {
    router.get('/projects/:project_id/files/:file_id',
        ra.validateProjectAccess, ra.validateFileInProject, get);
    router.get('/projects/:project_id/files/:file_id/versions',
        ra.validateProjectAccess, ra.validateFileInProject, getVersions);
    router.put('/projects/:project_id/files/:file_id',
        ra.validateProjectAccess, ra.validateFileInProject, update);
    router.post('/projects/:project_id/files', ra.validateProjectAccess, getList);
    router.delete('/projects/:project_id/files/:file_id',
        ra.validateProjectAccess, ra.validateFileInProject, deleteFile);
    router.put('/projects/:project_id/files_by_path', ra.validateProjectAccess, byPath);
}

module.exports = {
    createResources
};