var r = require('./../dash');
var parse = require('co-body');
var httpStatus = require('http-status');
var defineSchema = require('./../schema/define')();
var tag = require('./model/tag')();
var clone = require('clone');

module.exports.addTag = function*(next) {
    'use strict';
    var params = yield parse(this);
    var copyParams = clone(params);
    var tagSchema = defineSchema.tags;
    var rv;
    var err = yield tagSchema.validateAsync(params);
    if (err) {
        this['throw'](httpStatus.NOT_FOUND, 'Validation error: ' + err);
    }
    var is_tag = yield tag.getTag(params.tag);
    if (!is_tag) {
        prepareTag(params);
        rv = yield tag.insert(params);
    }
    var exists = yield tag.getTag2Dataset(copyParams);
    if (exists.length !== 0) {
        this['throw'](httpStatus.CONFLICT, 'Duplicate request');
    } else {
        rv = yield tag.addTag2Dataset(copyParams);
        this.status = 200;
        this.body = rv;
    }
    yield next;
};

module.exports.removeTag = function*(next) {
    var params = yield parse(this);
    var join = yield tag.getTag2Dataset(params);
    if (join.length > 0) {
        // removed user test - see issues #789 - Terry Weymouth Fri Oct 7, 2016
        // if (params.user_id === join[0].user_id) {
            this.body = yield tag.deleteTag2Dataset(join[0].id);
            this.status = 200;
            // remove tag if no related databases
            let hits = yield tag.getAllDatasetsForTag(params.tag);
            if (hits.length == 0) {
                let del = yield tag.deleteTag(params.tag);
            }
        // }
        // else {
        //    this.throw(httpStatus.FORBIDDEN, 'Unable to delete. User not author: ' + params.user_id);
        // }
    } else {
        this.throw(httpStatus.NOT_FOUND, 'Unable to delete. No such tag for dataset: ' + params.tag);
    }
    yield next;
};

module.exports.getTagsByCount = function*(next) {
    this.body = yield r.table('tags').merge(function(tag) {
        return {
            count: r.table('tag2dataset').getAll(tag('id'), {index: 'tag'}).count()
        }
    }).orderBy(r.desc('count'));
    yield next;
};

module.exports.getAllTags = function*(next) {
    let res = yield r.table('tags').orderBy('id').merge(function(tag) {
        return {
            count: r.table('tag2dataset').getAll(tag('id'), {index: 'tag'}).count()
        }
    });
    res = res.filter(tagAndCount => {
        return tagAndCount.count;
    });
    this.body = res;
    yield next;
};

module.exports.getAllCount = function*(next) {
    let c = yield r.table('tags').count();
    this.body = {count: c};
    yield next;
};

module.exports.getDatasetsByTag = function*(next) {
    this.body = yield r.table('tag2dataset').getAll(this.params.id, {index: 'tag'})
        .eqJoin('dataset_id', r.db("materialscommons").table('datasets')).zip()
        .merge(function(ds) {
            return {
                'files': r.table('dataset2datafile').getAll(ds('id'), {index: 'dataset_id'})
                    .eqJoin('datafile_id', r.table('datafiles')).zip().coerceTo('array'),
                'appreciations': r.table('appreciations').getAll(ds('id'), {index: 'dataset_id'}).count(),
                'views': r.table('views').getAll(ds('id'), {index: 'dataset_id'}).count()
            }
        });
    yield next;
};

function prepareTag(input) {
    return defineSchema.tags.stripNonSchemaAttrs(input);
}
