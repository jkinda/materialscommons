const r = require('../r');
const model = require('./model');
const _ = require('lodash');
const db = require('./db');
const commonQueries = require('../../../lib/common-queries');
const dbExec = require('./run');
const sampleCommon = require('./sample-common');


function* getProcess(processID) {
    let rql = commonQueries.processDetailsRql(r.table('processes').getAll(processID), r);
    let process = yield dbExec(rql);
    return process.length ? {val: process[0]} : {error: `No such process ${processID}`};
}

function* processIsUnused(processId) {
    let filesInProcess = yield r.table('process2file').getAll(processId, {index: 'process_id'});
    if (filesInProcess.length) {
        return false;
    }

    let samplesInProcess = yield r.table('process2sample').getAll(processId, {index: 'process_id'});
    if (samplesInProcess.length) {
        return false;
    }

    let processInDatasets = yield r.table('dataset2process').getAll(processId, {index: 'process_id'});
    return processInDatasets.length === 0;
}

function* updateProcessFiles(processId, files) {
    let filesToAddToProcess = files.filter(f => f.command === 'add').map(f => new model.Process2File(processId, f.id, ''));
    filesToAddToProcess = yield removeExistingProcessFileEntries(processId, filesToAddToProcess);
    if (filesToAddToProcess.length) {
        yield r.table('process2file').insert(filesToAddToProcess);
    }

    let filesToDeleteFromProcess = files.filter(f => f.command === 'delete').map(f => [processId, f.id]);
    if (filesToDeleteFromProcess.length) {
        yield r.table('process2file').getAll(r.args(filesToDeleteFromProcess), {index: 'process_datafile'}).delete();
    }

    return null;
}

function* removeExistingProcessFileEntries(processId, files) {
    if (files.length) {
        let indexEntries = files.map(f => [processId, f.datafile_id]);
        let matchingEntries = yield r.table('process2file').getAll(r.args(indexEntries), {index: 'process_datafile'});
        var byFileID = _.indexBy(matchingEntries, 'datafile_id');
        return files.filter(f => (!(f.datafile_id in byFileID)));
    }

    return files;
}


function* updateProperties(properties) {
    // Validate that the retrieved property matches that we are updating
    let errors = [];
    for (let i = 0; i < properties.length; i++) {
        let property = properties[i];
        // getAll returns an array
        let existingPropertyMatches = yield r.table('setupproperties')
            .getAll([property.id, property.setup_id], {index: 'id_setup_id'});
        if (!existingPropertyMatches.length) {
            // Skip, bad property
            errors.push({error: `No matching property/setup ${property.id}.${property.setup_id}`});
            continue;
        }
        let existingProperty = existingPropertyMatches[0];
        if (existingProperty.attribute !== property.attribute) {
            errors.push({error: `Attributes don't match: ${property.id}/${property.attribute} doesn't match ${existingProperty.attribute}`});
        } else if (existingProperty._type !== property._type) {
            errors.push({error: `Types don't match: ${property.id}/${property._type} doesn't match ${existingProperty._type}`});
        } else {
            existingProperty.value = property.value;
            existingProperty.unit = property.unit;
            existingProperty.description = property.description;
            yield r.table('setupproperties').get(property.id).update(existingProperty);
        }
    }

    if (errors.length) {
        return {errors: errors};
    }

    return null;
}

function* updateProcessSamples(process, samples) {
    let processId = process.id;
    let samplesToAddToProcess = samples.filter(s => s.command === 'add').map(s => new model.Process2Sample(processId, s.id, s.property_set_id, 'in'));
    samplesToAddToProcess = yield removeExistingProcessSampleEntries(processId, samplesToAddToProcess);
    if (samplesToAddToProcess.length) {
        yield r.table('process2sample').insert(samplesToAddToProcess);
    }

    if (process.does_transform) {
        for (let i = 0; i < samplesToAddToProcess.length; i++) {
            let sampleEntry = samplesToAddToProcess[i];
            let ps = new model.PropertySet(true, sampleEntry.property_set_id);
            let added = yield db.insert('propertysets', ps);
            yield r.table('sample2propertyset')
                .getAll([sampleEntry.sample_id, sampleEntry.property_set_id], {index: 'sample_property_set'})
                .update({current: false});
            let s2ps = new model.Sample2PropertySet(sampleEntry.sample_id, added.id, true);
            yield r.table('sample2propertyset').insert(s2ps);
            let outp2s = new model.Process2Sample(processId, sampleEntry.sample_id, added.id, 'out');
            yield r.table('process2sample').insert(outp2s);
        }
    }

    let samplesToDeleteFromProcess = samples.filter(s => s.command === 'delete').map(s => [processId, s.id, s.property_set_id]);
    let sampleIds = samples.filter(s => s.command === 'delete').map(s => s.id);
    let canBeDeleted = yield sampleCommon.canDeleteSamples(sampleIds, processId);
    if (!canBeDeleted) {
        // Ugh... work around - don't delete if used in other processes.
        return 'Some samples used in other processes - cannot be deleted.';
    }
    if (samplesToDeleteFromProcess.length) {
        yield r.table('process2sample').getAll(r.args(samplesToDeleteFromProcess), {index: 'process_sample_property_set'}).delete();
    }

    yield sampleCommon.removeUnusedSamples(sampleIds);

    return null;
}


function* removeExistingProcessSampleEntries(processId, samples) {
    if (samples.length) {
        let indexEntries = samples.map(s => [processId, s.sample_id, s.property_set_id]);
        let matchingEntries = yield r.table('process2sample').getAll(r.args(indexEntries), {index: 'process_sample_property_set'});
        var bySampleID = _.indexBy(matchingEntries, 'sample_id');
        return samples.filter(s => (!(s.sample_id in bySampleID)));
    }

    return samples;
}


function* createProcessFromTemplate(projectId, template, owner) {
    let p = new model.Process(template.name, owner, template.id, template.does_transform);
    // TODO: Fix ugly hack, template id is global_<name>, the substring removes the global_ part.
    p.process_type = template.process_type;
    p.template_name = template.id.substring(7);
    let proc = yield addProcess(projectId, p);
    yield createSetup(proc.id, template.setup);
    return proc.id;
}

// addProcess inserts the process and add it to the project.
function* addProcess(projectID, process) {
    let p = yield db.insert('processes', process);
    let p2proc = new model.Project2Process(projectID, p.id);
    yield db.insert('project2process', p2proc);
    return p;
}

function* createSetup(processID, settings) {
    for (let i = 0; i < settings.length; i++) {
        let current = settings[i];

        // Create the setting
        let s = new model.Setups(current.name, current.attribute);
        let setup = yield db.insert('setups', s);

        // Associate it with the process
        let p2s = new model.Process2Setup(processID, setup.id);
        yield db.insert('process2setup', p2s);

        // Create each property for the setting. Add these to the
        // setting variable so we can return a setting object with
        // all of its properties.
        // TODO: Add into an array and then batch insert into setupproperties
        for (let j = 0; j < current.properties.length; j++) {
            let p = current.properties[j].property;
            let val = p.value;
            let prop = new model.SetupProperty(setup.id, p.name, p.description, p.attribute,
                p._type, val, p.unit);
            yield db.insert('setupproperties', prop);
        }
    }
}

module.exports = {
    getProcess,
    updateProcessFiles,
    updateProperties,
    updateProcessSamples,
    createProcessFromTemplate,
    processIsUnused
};



