const r = require('../r');
const dbExec = require('./run');
const model = require('./model');
const db = require('./db');
const _ = require('lodash');
const commonQueries = require('../../../lib/common-queries');

function* getSample(sampleID) {
    let rql = r.table('samples').get(sampleID)
        .merge(function(sample) {
            return {
                processes: r.table('process2sample').getAll(sample('id'), {index: 'sample_id'})
                    .eqJoin('process_id', r.table('processes')).zip()
                    .merge(function(process) {
                        return {
                            measurements: r.table('process2measurement')
                                .getAll(process('process_id'), {index: 'process_id'})
                                .eqJoin('measurement_id', r.table('measurements')).zip().coerceTo('array')
                        };
                    }).orderBy('birthtime').coerceTo('array'),
                files: r.table('sample2datafile').getAll(sample('id'), {index: 'sample_id'})
                    .eqJoin('datafile_id', r.table('datafiles')).zip().coerceTo('array')
            }
        });
    let sample = yield dbExec(rql);
    return {val: sample};
}

function* getAllSamplesForProject(projectID) {
    let projectSamplesRql = r.table('project2sample').getAll(projectID, {index: 'project_id'})
        .eqJoin('sample_id', r.table('sample2propertyset'), {index: 'sample_id'})
        .zip().filter({'current': true})
        .eqJoin('sample_id', r.table('samples')).zip();
    return yield getAllSamplesFromQuery(projectSamplesRql);
}

function* getAllSamplesForExperiment(experimentId) {
    let experimentSamplesRql = r.table('experiment2sample').getAll(experimentId, {index: 'experiment_id'})
        .eqJoin('sample_id', r.table('sample2propertyset'), {index: 'sample_id'})
        .zip().filter({'current': true})
        .eqJoin('sample_id', r.table('samples')).zip();
    return yield getAllSamplesFromQuery(experimentSamplesRql);
}

function* getAllSamplesFromQuery(query) {
    let rql = commonQueries.sampleDetailsRql(query, r);
    let samples = yield dbExec(rql);
    samples = samples.map(s => {
        s.transforms = s.processes.filter(p => p.does_transform).length;
        s.properties = s.properties.map(p => {
            if (p.best_measure.length) {
                p.best_measure = p.best_measure[0];
            } else {
                p.best_measure = null;
            }
            return p;
        });
        return s;
    });
    return {val: samples};
}

function* createSamples(projectId, processId, samples, owner) {
    let pset = new model.PropertySet(true);
    let createdPSet = yield db.insert('propertysets', pset);
    let createdSamples = [];
    for (let i = 0; i < samples.length; i++) {
        let sampleParams = samples[i];
        let s = new model.Sample(sampleParams.name, sampleParams.description, owner);
        let createdSample = yield db.insert('samples', s);
        let s2ps = new model.Sample2PropertySet(createdSample.id, createdPSet.id, true);
        yield db.insert('sample2propertyset', s2ps);
        let proc2sample = new model.Process2Sample(processId, createdSample.id, createdPSet.id, 'out');
        let proj2sample = new model.Project2Sample(projectId, createdSample.id);
        yield db.insert('process2sample', proc2sample);
        yield db.insert('project2sample', proj2sample);
        createdSamples.push({name: s.name, id: createdSample.id, property_set_id: createdPSet.id});
    }

    return {val: {samples: createdSamples}};
}

function* isValidCreateSamplesProcess(projectId, processId) {
    let processes = yield r.table('project2process').getAll([projectId, processId], {index: 'project_process'});
    if (processes.length === 0) {
        return false;
    }
    let process = yield r.table('processes').get(processId)
        .merge((p) => r.table('templates').get(p('template_id')).pluck('category'));
    return (process.category === 'create_sample') || (process.category === 'sectioning');
}

function* updateSamples(samples) {
    yield r.table('samples').insert(samples, {conflict: 'update'});
    return {val: samples};
}

function* addSamplesMeasurements(properties) {
    for (let i = 0; i < properties.length; i++) {
        let prop = properties[i];
        if (prop.add_as === 'shared') {
            yield addSharedPropertyMeasurementsForSamples(prop);
        } else {
            yield addSeparatePropertyMeasurementsForSamples(prop);
        }
    }
    return {val: true};
}

function* addSharedPropertyMeasurementsForSamples(prop) {
    let p = new model.Property(prop.name, prop.attribute);
    let insertedProperty = yield db.insert('properties', p);
    yield addPropertyMeasurements(insertedProperty.id, "", prop.name, prop.attribute, prop.measurements);
    for (let i = 0; i < prop.samples.length; i++) {
        let s = prop.samples[i];
        yield addPropertyToPropertySet(insertedProperty.id, s.property_set_id);
    }
}

function* addPropertyToPropertySet(propertyId, psetId) {
    let ps2p = new model.PropertySet2Property(propertyId, psetId);
    yield db.insert('propertyset2property', ps2p);
}

function* addPropertyMeasurements(propertyId, sampleId, pName, pAttr, measurements) {
    for (let i = 0; i < measurements.length; i++) {
        let current = measurements[i];
        let m = new model.Measurement(pName, pAttr, sampleId);
        m.value = current.value;
        m.unit = current.unit;
        m.otype = current.otype;
        let insertedMeasurement = yield db.insert('measurements', m);
        if (current.is_best_measure) {
            yield addAsBestMeasure(propertyId, insertedMeasurement.id)
        }
        yield addMeasurementToProperty(propertyId, insertedMeasurement.id)
    }
}

function* addMeasurementToProperty(propID, mID) {
    let a2m = new model.Property2Measurement(propID, mID);
    yield db.insert('property2measurement', a2m);
}

function* addSeparatePropertyMeasurementsForSamples(prop) {
    for (let i = 0; i < prop.samples.length; i++) {
        let s = prop.samples[i];
        yield addNewPropertyMeasurements(s.id, s.property_set_id, prop.property, prop.measurements);
    }
}

function* addAsBestMeasure(propertyID, measurementID) {
    let bmh = new model.BestMeasureHistory(propertyID, measurementID);
    let inserted = yield db.insert('best_measure_history', bmh);
    yield r.table('properties').get(propertyID).update({best_measure_id: inserted.id});
}

function *addNewPropertyMeasurements(sampleID, psetID, prop, measurements) {
    let p = new model.Property(prop.name, prop.attribute);
    let inserted = yield db.insert('properties', p);
    let ps2p = new model.PropertySet2Property(inserted.id, psetID);
    yield db.insert('propertyset2property', ps2p);
    yield addPropertyMeasurements(inserted.id, sampleID, prop.name, prop.attribute, measurements);
}

function* updateSamplesMeasurements() {
    for (let i = 0; i < properties.length; i++) {
        let prop = properties[i];
        let measurementsToAdd = prop.measurements.filter((m) => !m.id);
        let measurementsToUpdate = prop.measurements.filter((m) => m.id);
        let propToAdd = _.clone(prop),
            propToUpdate = _.clone(prop);
        propToAdd.measurements = measurementsToAdd;
        propToUpdate.measurements = measurementsToUpdate;
        if (propToAdd.measurements.length) {
            if (propToAdd.add_as === 'shared') {
                yield addSharedPropertyMeasurementsForSamples(propToAdd);
            } else {
                yield addSeparatePropertyMeasurementsForSamples(propToAdd);
            }
        }

        if (propToUpdate.measurements.length) {
            yield updatedExistingPropertyMeasurementsForSamples(propToUpdate);
        }
    }

    return {val: true};
}

function* updatedExistingPropertyMeasurementsForSamples(prop) {
    let measurementsWithUpdates = prop.measurements.map((m) => {
        return {id: m.id, unit: m.unit, value: m.value};
    });
    yield r.table('measurements').insert(measurementsWithUpdates, {conflict: 'update'});
}

function* deleteSamplesMeasurements() {
    return null;
}

function* updateSampleFiles(sampleId, sampleFiles) {
    let fileSamplesToAdd = sampleFiles.filter(s2d => s2d.command === 'add')
        .map(s2d => new model.Sample2Datafile(sampleId, s2d.id));
    fileSamplesToAdd = yield removeExistingSampleFileEntries(fileSamplesToAdd);
    if (fileSamplesToAdd.length) {
        yield r.table('sample2datafile').insert(fileSamplesToAdd);
    }

    let fileSamplesToDelete = sampleFiles.filter(s2d => s2d.command === 'delete').map(s2d => [sampleId, s2d.id]);
    if (fileSamplesToDelete.length) {
        yield r.table('sample2datafile').getAll(r.args(fileSamplesToDelete), {index: 'sample_file'}).delete();
    }

    return {val: true};
}

function* removeExistingSampleFileEntries(sampleFileEntries) {
    if (sampleFileEntries.length) {
        let indexEntries = sampleFileEntries.map(entry => [entry.sample_id, entry.datafile_id]);
        let matchingEntries = yield r.table('sample2datafile').getAll(r.args(indexEntries), {index: 'sample_file'});
        var byFileID = _.indexBy(matchingEntries, 'datafile_id');
        return sampleFileEntries.filter(entry => (!(entry.datafile_id in byFileID)));
    }
    return sampleFileEntries;
}

module.exports = {
    getSample,
    getAllSamplesForProject,
    getAllSamplesForExperiment,
    createSamples,


    isValidCreateSamplesProcess,
    updateSamples,
    addSamplesMeasurements,
    updateSamplesMeasurements,
    deleteSamplesMeasurements,
    updateSampleFiles
};
