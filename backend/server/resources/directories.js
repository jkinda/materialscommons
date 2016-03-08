module.exports = function(directories, schema) {
    const parse = require('co-body');
    const httpStatus = require('http-status');

    return {
        get,
        create,
        update
    };

    ////////////////
    function* get(next) {
        let dirID = this.params.directory_id || 'top';
        this.body = yield directories.get(this.params.project_id, dirID);
        yield next;
    }

    function* create(next) {
        let dirArgs = yield parse(this);
        dirArgs = prepareDirArgs(this.params.project_id, dirArgs);
        console.log('calling schema.createDirectory.validateAsync');

        let errors = yield validateDirArgs(dirArgs);
        if (errors != null) {
            this.status = httpStatus.BAD_REQUEST;
            this.body = errors;
        } else {
            let rv = yield directories.create(this.params.project_id, this.reqctx.project.name, dirArgs);
            if (rv.error) {
                this.status = httpStatus.NOT_ACCEPTABLE;
                this.body = rv;
            } else {
                this.body = {dirs: rv.val};
            }
        }
        yield next;
    }

    function prepareDirArgs(projectID, dirArgs) {
        schema.createDirectory.stripNonSchemaAttrs(dirArgs);
        dirArgs.project_id = projectID;
        return dirArgs;
    }

    function validateDirArgs(dirArgs) {
        return schema.createDirectory.validateAsync(dirArgs).then(function() {
            console.log('dirArgs validated');
            return null;
        }, function(errors) {
            console.log('dirArgs did not validate', errors);
            return errors;
        });
    }

    // TODO: Finish moving code to schema validator.
    function* update(next) {
        let updateArgs = yield parse(this);

        if (!updateArgs.move && !updateArgs.rename) {
            this.body = {error: 'badly formed update args'};
            this.status = httpStatus.BAD_REQUEST;
        } else if (updateArgs.move) {
            prepareUpdateArgsBySchema(schema)
            this.throw(httpStatus.BAD_REQUEST, 'no directory id to move to');
        } else if (updateArgs.rename) {
            this.throw(httpStatus.BAD_REQUEST, 'no new directory name');
        }

        let rv = yield directories.update(this.params.project_id, this.params.directory_id, updateArgs);
        if (rv.error) {
            this.throw(httpStatus.BAD_REQUEST, rv.error);
        }
        this.body = rv.val;
        yield next;
    }

    function prepareUpdateArgsBySchema(schema, projectID, args) {
        schema.stripNonSchemaAttrs(args);
        args.project_id = projectID;
        return args;
    }
    function validateMoveArgs(moveArgs) {

    }
};
