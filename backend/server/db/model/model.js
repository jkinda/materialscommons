module.exports = function(r) {
    'use strict';

    let db = require('./db')(r);

    ///////////////////////////////////////

    function Sample(name, description, owner) {
        this.name = name;
        this.description = description;
        this.owner = owner;
        this.birthtime = r.now();
        this.mtime = this.birthtime;
        this.is_grouped = false;
        this.has_group = false;
        this.group_size = 0;
        this._type = "sample";
    }

    function Process(name, owner, templateId, transform) {
        this.name = name;
        this.owner = owner;
        this.template_id = templateId;
        this.birthtime = r.now();
        this.mtime = this.birthtime;
        this._type = "process";
        this.does_transform = transform;
    }

    function Process2Setup(processID, setupID) {
        this.setup_id = setupID;
        this.process_id = processID;
    }

    function Process2Measurement(processID, mID) {
        this.measurement_id = mID;
        this.process_id = processID;
    }

    function Process2Sample(processID, sampleID, psetID, direction) {
        this.sample_id = sampleID;
        this.process_id = processID;
        this.property_set_id = psetID;
        this.direction = direction;
    }

    function Process2Setupfile(processID, fileID) {
        this.process_id = processID;
        this.datafile_id = fileID;
    }

    function Process2File(processID, fileID, direction) {
        this.process_id = processID;
        this.datafile_id = fileID;
        this.direction = direction;
    }

    function Setups(name, attribute) {
        this.name = name;
        this.attribute = attribute;
        this.birthtime = r.now();
        this._type = "settings";
    }

    function SetupProperty(setupID, name, description, attribute, _type, value, unit) {
        this.setup_id = setupID;
        this.name = name;
        this.description = description;
        this.attribute = attribute;
        this._type = _type;
        this.value = value;
        this.unit = unit;
    }

    function Measurement(name, attribute, sampleID) {
        this.name = name;
        this.attribute = attribute;
        this.sample_id = sampleID;
        this._type = "measurement";
        this.file = {};
    }

    Measurement.prototype.setValue = function(value, units, _type, nvalue, nunits, element) {
        this.value = value;
        this._type = _type;
        this.unit = units;
        this.element = element;
        this.nvalue = nvalue ? nvalue : value;
        this.nunits = nunits ? nunits : units;
    };

    Measurement.prototype.setFile = function(f) {
        this.file = f;
    };

    function Property(name, attribute) {
        this.parent_id = '';
        this.birthtime = r.now();
        this._type = 'property';
        this.name = name;
        this.attribute = attribute;
        this.best_measure_id = '';
    }

    function PropertySet(current, parent_id) {
        this.current = current ? current : false;
        this.parent_id = parent_id ? parent_id : '';
    }

    function Property2Measurement(attrID, measurementID) {
        this.property_id = attrID;
        this.measurement_id = measurementID;
    }

    function Property2Process(attrID, processID) {
        this.property_id = attrID;
        this.process_id = processID;
    }

    function Project2Process(projectID, processID) {
        this.project_id = projectID;
        this.process_id = processID;
    }

    function Project2Sample(projectID, sampleID) {
        this.project_id = projectID;
        this.sample_id = sampleID;
    }

    function Sample2PropertySet(sampleID, psetID, current) {
        this.property_set_id = psetID;
        this.sample_id = sampleID;
        this.version  = '';
        this.current = current;
    }

    function PropertySet2Property(attrID, asetID) {
        this.property_set_id = asetID;
        this.property_id = attrID;
    }

    function BestMeasureHistory(propertyID, mID) {
        this.property_id = propertyID;
        this.measurement_id = mID;
        this.when = r.now();
        this._type = 'best_measure_history';
    }

    function Sample2Datafile(sampleID, datafileID){
        this.datafile_id = datafileID;
        this.sample_id = sampleID;
    }

    function Note(title, note, projectID, owner) {
        let now = r.now();
        this.title = title;
        this.note = note;
        this.project_id = projectID;
        this.owner = owner;
        this.mtime = now;
        this.birthtime = now;
    }

    function Note2Item(itemID, itemType, noteID) {
        this.item_id = itemID;
        this.item_type = itemType;
        this.note_id = noteID;
    }

    function Tag2Item(tagID, itemID, itemType) {
        this.tag_id = tagID;
        this.item_type = itemType;
        this.item_id = itemID;
    }

    function Directory(name, owner, project, parent) {
        let now = r.now();
        this._type = "datadir";
        this.owner = owner;
        this.name = name;
        this.project = project;
        this.parent = parent;
        this.birthtime = now;
        this.mtime = now;
        this.atime = now;
    }

    function Project2DataDir(projectID, dirID) {
        this.project_id = projectID;
        this.datadir_id = dirID;
    }

    function Sample2Sample(parentID, childID) {
        this.parent_sample_id = parentID;
        this.sample_id = childID;
    }

    function Share(projectID, itemID, itemType, itemName) {
        let now = r.now();
        this._type = 'share';
        this.project_id = projectID;
        this.item_id = itemID;
        this.item_type = itemType;
        this.item_name = itemName;
        this.birthtime = now;
    }

    function User2Share(userID, shareID) {
        this.user_id = userID;
        this.share_id = shareID;
    }

    function Experiment(name, owner) {
        let now = r.now();
        this.name = name;
        this.owner = owner;
        this._type = 'experiment';
        this.description = '';
        this.goals = [];
        this.aims = [];
        this.hypothesis = [];
        this.note = '<h2>Experiment Notes</h2>';
        this.status = 'active';
        this.birthtime = now;
        this.mtime = now;
    }

    function ExperimentTask(name, owner) {
        let now = r.now();
        this.name = name;
        this.owner = owner;
        this.index = 0;
        this._type = 'experiment_task';
        this.note = 'Notes here...';
        this.estimate = {
            value: 0,
            unit: ''
        };
        this.due_date = 0;
        this.flags = {
            starred: false,
            flagged: false,
            onhold: false,
            done: false
        };
        this.template_id = '';
        this.process_id = '';
        this.parent_id = '';
        this.birthtime = now;
        this.mtime = now;
    }

    function Experiment2ExperimentTask(experimentID, experimentTaskID) {
        this.experiment_id = experimentID;
        this.experiment_task_id = experimentTaskID;
    }

    function Project2Experiment(project_id, experiment_id) {
        this.project_id = project_id;
        this.experiment_id = experiment_id;
    }

    function ExperimentNote(name, note, owner) {
        let now = r.now();
        this.name = name;
        this.note = note;
        this.owner = owner;
        this.birthtime = now;
        this.mtime = now;
    }

    function Experiment2ExperimentNote(experimentID, experimentNoteID) {
        this.experiment_id = experimentID;
        this.experiment_note_id = experimentNoteID;
    }

    function Experiment2Process(experimentID, processID) {
        this.experiment_id = experimentID;
        this.process_id = processID;
    }

    return {
        Sample: Sample,
        Process: Process,
        Process2Setup: Process2Setup,
        Process2Measurement: Process2Measurement,
        Process2Sample: Process2Sample,
        Process2Setupfile: Process2Setupfile,
        Process2File: Process2File,
        Setups: Setups,
        SetupProperty: SetupProperty,
        Measurement: Measurement,
        Property: Property,
        Property2Process: Property2Process,
        Property2Measurement: Property2Measurement,
        PropertySet: PropertySet,
        PropertySet2Property: PropertySet2Property,
        Project2Process: Project2Process,
        Project2Sample: Project2Sample,
        Sample2PropertySet: Sample2PropertySet,
        BestMeasureHistory: BestMeasureHistory,
        Sample2Datafile: Sample2Datafile,
        Note: Note,
        Note2Item: Note2Item,
        Tag2Item: Tag2Item,
        Directory: Directory,
        Project2DataDir: Project2DataDir,
        Sample2Sample: Sample2Sample,
        Share: Share,
        User2Share: User2Share,
        Experiment: Experiment,
        Project2Experiment: Project2Experiment,
        ExperimentTask,
        Experiment2ExperimentTask,
        ExperimentNote,
        Experiment2ExperimentNote,
        Experiment2Process
    };
};
