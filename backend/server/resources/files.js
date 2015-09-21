module.exports = function(files) {
    const parse = require('co-body');
    const httpStatus = require('http-status');

    return {
        get: get,
        put: put
    };

    ///////////////////

    // get retrieves a file.
    function* get(next) {
        this.body = yield files.get(this.params.file_id);
        yield next;
    }

    // put will update certain file fields. To see which fields can be updated look
    // at the files.put method.
    function* put(next) {
        let file = yield parse(this);
        let rv = yield files.put(this.params.file_id, file);
        if (rv.error) {
            this.throw(httpStatus.BAD_REQUEST, rv.error);
        }
        this.body = rv.val;
        yield next;
    }
};
