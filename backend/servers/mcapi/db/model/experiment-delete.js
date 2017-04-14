const r = require('../r');
const dbExec = require('./run');
const db = require('./db');
const model = require('./model');

const experimentDatasets = require('./experiment-datasets');
const experiments = require('./experiments');
const processes = require('./processes');

function* deleteExperiment(projectId, experimentId, options) {

    let deleteProcesses = !!(options && options.deleteProcesses);
    let dryRun = !!(options && options.dryRun);

    console.log("deleteProcesses: ", deleteProcesses);
    console.log("dryRun: ", dryRun);

    let results = yield experimentDatasets.getDatasetsForExperiment(experimentId);
    let datasetList = results.val;

    let hasPublishedDatasets = yield testForPublishedDataasets(experimentId);
    if (hasPublishedDatasets) {
        return {error: "Can not delete an experiment with published datasets"}
    }

    let overallResults = {};

    overallResults['datasets'] = yield deleteDataSets(experimentId, dryRun);

    if (deleteProcesses) {
        let partialResults = yield deleteProcessesSamplesSetupAndMeasure(projectId, experimentId, dryRun);
        overallResults['best_measure_history'] = partialResults.best_measure_history;
        overallResults['processes'] = partialResults.processes;
        overallResults['samples'] = partialResults.samples;
    } else {
        overallResults['best_measure_history'] = [];
        overallResults['processes'] = [];
        overallResults['samples'] = [];
    }
    overallResults['experiment_notes'] = yield deleteExperimentNotes(experimentId, dryRun);

    let partialResults = yield deleteExperimentTasks(experimentId, dryRun);
    overallResults['experiment_task_processes'] = partialResults.experiment_task_processes;
    overallResults['experiment_tasks'] = partialResults.experiment_tasks;

    let fileLinkIds = yield deleteExperimentFileLinks(experimentId, dryRun);

    let allPosibleItems = fileLinkIds;
    allPosibleItems = allPosibleItems.concat(overallResults.processes);
    allPosibleItems = allPosibleItems.concat(overallResults.samples);

    overallResults['notes'] = yield deleteNotes(allPosibleItems, dryRun);
    overallResults['reviews'] = yield deleteReviews(allPosibleItems, dryRun);

    yield clearAllRemainingLinks(experimentId);

    yield r.table('experiments').get(experimentId).delete();

    overallResults['experiments'] = [experimentId];

    return {val: overallResults};
}

module.exports = {
    deleteExperiment
};

function* testForPublishedDataasets(experimentId) {
    let results = yield experimentDatasets.getDatasetsForExperiment(experimentId);
    let datasetList = results.val;

    let hasPublishedDatasets = false;
    for (let i = 0; i < datasetList.length; i++) {
        let dataset = datasetList[i];
        if (dataset.published) {
            hasPublishedDatasets = true;
        }
    }
    return hasPublishedDatasets;
}

function* deleteDataSets(experimentId, dryRun) {
    let results = yield experimentDatasets.getDatasetsForExperiment(experimentId);
    let datasetList = results.val;

    let idList = [];
    for (let i = 0; i < datasetList.length; i++) {
        let dataset = datasetList[i];
        results = yield experimentDatasets.deleteDataset(dataset.id);
        if (results && results.val) {
            idList.push(dataset.id);
        }
    }
    return idList;
}

function* deleteProcessesSamplesSetupAndMeasure(projectId, experimentId, dryRun) {
    let partialResults = {};

    let idList = yield r.table('experiment2sample')
        .getAll(experimentId, {index: 'experiment_id'})
        .eqJoin('sample_id', r.table('samples')).zip()
        .eqJoin('sample_id', r.table('sample2propertyset'), {index: 'sample_id'}).zip()
        .eqJoin('property_set_id', r.table('propertysets')).zip()
        .eqJoin('property_set_id', r.table('propertyset2property'), {index: 'property_set_id'}).zip()
        .eqJoin('property_id', r.table('properties')).zip()
        .eqJoin('property_id', r.table('best_measure_history'), {index: 'property_id'}).zip()
        .getField('property_id');
    let delete_msg = yield r.table('best_measure_history')
        .getAll(r.args([...idList]), {index: 'property_id'}).delete();
    if (delete_msg.deleted === idList.length) {
        partialResults['best_measure_history'] = idList;
    } // else ?

    let sampleIdSet = new Set();
    idList = [];
    let simple = true;
    let results = yield experiments.getProcessesForExperiment(experimentId, simple);
    let processList = results.val;

    for (let i = 0; i < processList.length; i++) {
        let process = processList[i];
        for (let j = 0; j < process.input_samples.length; j++) {
            let id = process.input_samples[j].id;
            sampleIdSet.add(id);
        }
        for (let j = 0; j < process.output_samples.length; j++) {
            let id = process.output_samples[j].id;
            sampleIdSet.add(id);
        }
        idList.push(process.id);
        yield processes.deleteProcess(projectId, process.id);
    }

    partialResults['processes'] = idList;

    let sampleList = yield r.table('experiment2sample')
        .getAll(experimentId, {index: 'experiment_id'})
        .eqJoin('sample_id', r.table('samples')).zip()
        .getField('sample_id');

    results = yield r.table('samples').getAll(r.args([...sampleList])).delete();
    if (results.deleted === sampleList.length) {
        for (let i = 0; i < sampleList.length; i++) {
            let id = sampleList[i];
            sampleIdSet.add(id);
        }
    } // else?

    partialResults['samples'] = [...sampleIdSet];

    return partialResults;
}

function* deleteExperimentNotes(experimentId, dryRun) {
    let ret = [];
    let idList = yield r.table('experiment2experimentnote')
        .getAll(experimentId, {index: 'experiment_id'})
        .eqJoin('experiment_note_id', r.table('experimentnotes'))
        .zip().getField('experiment_note_id');

    let delete_msg1 = yield r.table('experimentnotes').getAll(r.args([...idList])).delete();

    let delete_msg2 = yield r.table('experiment2experimentnote')
        .getAll(experimentId, {index: 'experiment_id'}).delete();

    if ((delete_msg1.deleted === idList.length) && (delete_msg2.deleted === idList.length)) {
        ret = idList;
    } // else?

    return ret;
}

function* deleteExperimentTasks(experimentId, dryRun) {
    let partialResults = {};

    let taskidList = yield r.table('experiment2experimenttask')
        .getAll(experimentId, {index: 'experiment_id'})
        .eqJoin('experiment_task_id', r.table('experimenttasks'))
        .zip().getField('experiment_task_id');

    let idList = yield r.table('experimenttask2process')
        .getAll(r.args([...taskidList]), {index: 'experiment_task_id'})
        .eqJoin('process_id', r.table('processes'))
        .zip().getField('process_id');
    let delete_msg = yield r.table('processes').getAll(r.args([...idList])).delete();
    if (delete_msg.deleted === idList.length) {
        partialResults['experiment_task_processes'] = idList;
    }

    yield r.table('experimenttask2process')
        .getAll(r.args([...taskidList]), {index: 'experiment_task_id'}).delete();

    delete_msg = yield r.table('experimenttasks').getAll(r.args([...taskidList])).delete();
    if (delete_msg.deleted === taskidList.length) {
        partialResults['experiment_tasks'] = taskidList;
    }

    delete_msg = yield r.table('experiment2experimenttask')
        .getAll(experimentId, {index: 'experiment_id'}).delete();

    return partialResults;
}

function* deleteExperimentFileLinks(experimentId, dryRun) {
    let fileLinkIds = yield r.table('experiment2datafile')
        .getAll(experimentId, {index: 'experiment_id'}).getField('datafile_id');

    let delete_msg = yield r.table('experiment2datafile')
        .getAll(experimentId, {index: 'experiment_id'}).delete();

    return fileLinkIds;
}

function* deleteNotes(allPosibleItems, dryRun) {
    let noteIdSet = new Set();

    let noteItems = yield r.table('note2item').getAll(r.args(allPosibleItems), {index: 'item_id'});
    for (let i = 0; i < noteItems.length; i++) {
        let noteId = noteItems[i].note_id;
        noteIdSet.add(noteId);
    }

    let noteIdList = [...noteIdSet];
    yield r.table('note2item').getAll(r.args(noteIdList), {index: 'note_id'}).delete();
    yield r.table('notes').getAll(r.args(noteIdList)).delete();

    return noteIdList;
}

function* deleteReviews(allPosibleItems, dryRun) {
    let reviewIdSet = new Set();

    let reviewItems = yield r.table('review2item').getAll(r.args(allPosibleItems), {index: 'item_id'});
    for (let i = 0; i < reviewItems.length; i++) {
        let reviewId = reviewItems[i].review_id;
        reviewIdSet.add(reviewId);
    }

    let reviewIdList = [...reviewIdSet];
    yield r.table('review2item').getAll(r.args(reviewIdList), {index: 'review_id'}).delete();
    yield r.table('reviews').getAll(r.args(reviewIdList)).delete();

    return reviewIdList;
}

function* clearAllRemainingLinks(experimentId) {
    let tables = [
        'experiment2datafile',
        'experiment2dataset',
        'experiment2experimentnote',
        'experiment2experimenttask',
        'experiment2process',
        'experiment2sample',
        'project2experiment'
    ];

    for (let i = 0; i < tables.length; i++) {
        let table = tables[i];
        let list = yield r.table(table)
            .getAll(experimentId,{index: 'experiment_id'}).delete();
    }
}