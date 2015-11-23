/**
 * Processes module. This module implement the CRUD model for processes.
 * @module db/model/processes
 */

/**
 * Sets up the CRUD methods for processes. Saves the rethinkdbdash parameter
 * for access by exported methods.
 *
 * @param {Object} r - The rethinkdbdash instance.
 */
module.exports = function (r) {
    'use strict';

    let model = require('./model')(r);
    let db = require('./db')(r);
    let dbExec = require('./run');

    return {
        update: update,
        create: create,
        get: get,
        getList: getList,
        r: r
    };

    ///////////////// Module public methods /////////////////

    /**
     * Updates existing process fields
     */
    function *update(processID, process) {
        if (process.setup) {
            yield updateProcessSetup(process.setup);
        }

        if (process.name || process.why || process.what) {
            yield updateProcessAttributes(processID, process);
        }

        if (process.input_samples && process.input_samples.length) {
            yield updateSamples(processID, process.input_samples);
        }

        if (process.input_files && process.input_files.length) {
            yield updateFiles(processID, process.input_files, 'in');
        }

        if (process.output_files && process.output_files.length) {
            yield updateFiles(processID, process.output_files, 'out');
        }

        if (process.sample_files && process.sample_files.length) {
            yield updateSampleFiles(process.sample_files);
        }

        return yield get(processID);
    }

    // updateProcessSetup updates the setupproperties table entries. It assumes
    // that the list of properties already exists.
    function* updateProcessSetup(setupProperties) {
        let rql = r.table('setupproperties').insert(setupProperties, {conflict: "update"});
        yield dbExec(rql);
    }

    // updateProcessAttributes updates the name, why and/or what properties for a
    // process. It explicitly checks that they exist.
    function* updateProcessAttributes(processID, process) {
        let updateAttrs = {};
        if (process.name) {
            updateAttrs.name = process.name;
        }
        if (process.why) {
            updateAttrs.why = process.why;
        }
        if (process.what) {
            updateAttrs.what = process.what;
        }
        yield db.update('processes', processID, updateAttrs);
    }

    // updateFiles adds or deletes files from the process
    function* updateFiles(processID, files, direction) {
        let filesToAdd = files.filter(f => f.command == 'add').
        map(f => new model.Process2File(processID, f.id, direction));
        if (filesToAdd.length) {
            yield addFilesToProcess(filesToAdd);
        }

        let filesToDelete = files.filter(f => f.command == 'delete').map(f => f.id);
        if (filesToDelete.length) {
            yield deleteFilesFromProcess(processID, filesToDelete);
        }
    }

    // addFilesToProcess adds new files to a process.
    // TODO: Handle files that are already part of the process.
    function* addFilesToProcess(files) {
        let rql = r.table('process2file').insert(files);
        yield dbExec(rql);
    }

    // deleteFilesFromProcess deletes files from a process
    // TODO: Handle files that are also mapped to a sample through this process
    function* deleteFilesFromProcess(processID, files) {
        yield r.table('process2file').getAll(r.args(files), {index: 'datafile_id'})
            .filter({process_id: processID})
            .delete();
    }

    function* updateSamples(processID, samples) {
        let samplesToAdd = samples.filter(s => s.command === 'add')
            .map(s => new model.Process2Sample(processID, s.id, s.property_set_id, 'in'));
        if (samplesToAdd.length) {
            let addRql = r.table('process2sample').insert(samplesToAdd);
            yield dbExec(addRql);
        }

        let samplesToDelete = samples.filter(s => s.command == 'delete').map(s => [processID, s.id, s.property_set_id]);
        if (samplesToDelete.length) {
            let deleteRql = r.table('process2sample').
            getAll(r.args(samplesToDelete), {index: 'process_sample_property_set'}).delete();
            yield dbExec(deleteRql);
        }
    }

    function* updateSampleFiles(sampleFiles) {
        let fileSamplesToAdd = sampleFiles.filter(s => s.command === 'add')
            .map(s => new model.Sample2Datafile(s.id, s.file_id));
        if (fileSamplesToAdd.length) {
            let addRql = r.table('sample2datafile').insert(fileSamplesToAdd);
            yield dbExec(addRql);
        }

        let fileSamplesToDelete = sampleFiles.filter(s => s.command === 'delete').map(s => [s.id, s.file_id]);
        if (fileSamplesToDelete.length) {
            let deleteRql = r.table('sample2datafile')
                .getAll(r.args(fileSamplesToDelete), {index: 'sample_file'}).delete();
            yield dbExec(deleteRql);
        }
    }

    function* get(processID) {
        let rql = processDetailsRql(r.table('processes').getAll(processID));
        let process = yield dbExec(rql);
        return process.length ? {val: process[0]} : {error: `No such process ${processID}`};
    }

    function* getList(projectID) {
        let rql = processDetailsRql(r.table('project2process').getAll(projectID, {index: 'project_id'})
            .eqJoin('process_id', r.table('processes')).zip());
        let processes = yield dbExec(rql);
        return {val: processes};
    }

    function processDetailsRql(rql) {
        return rql.merge(function (process) {
            return {
                setup: r.table('process2setup').getAll(process('id'), {index: 'process_id'})
                    .eqJoin('setup_id', r.table('setups')).zip().
                    merge(function (setup) {
                        return {
                            properties: r.table('setupproperties')
                                .getAll(setup('setup_id'), {index: 'setup_id'})
                                .coerceTo('array')
                        }
                    }).coerceTo('array'),
                samples: r.table('process2sample').getAll(process('id'), {index: 'process_id'})
                    .eqJoin('sample_id', r.table('samples')).zip()
                    .merge(function (sample) {
                        return {
                            properties: r.table('propertyset2property')
                                .getAll(sample('property_set_id'), {index: 'property_set_id'})
                                .eqJoin('property_id', r.table('properties')).zip()
                                .orderBy('name')
                                .merge(function (property) {
                                    return {
                                        best_measure: r.table('best_measure_history')
                                            .getAll(property('best_measure_id'))
                                            .eqJoin('measurement_id', r.table('measurements'))
                                            .zip().coerceTo('array')
                                    }
                                }).coerceTo('array'),
                            files: r.table('sample2datafile').getAll(sample('id'), {index: 'sample_id'})
                                .eqJoin('datafile_id', r.table('datafiles')).zip().pluck('id', 'name')
                                .coerceTo('array')
                        }
                    }).coerceTo('array'),
                input_files: r.table('process2file').getAll(process('id'), {index: 'process_id'})
                    .filter({direction: 'in'})
                    .eqJoin('datafile_id', r.table('datafiles'))
                    .zip().coerceTo('array'),
                output_files: r.table('process2file').getAll(process('id'), {index: 'process_id'})
                    .filter({direction: 'out'})
                    .eqJoin('datafile_id', r.table('datafiles'))
                    .zip().coerceTo('array')
            }
        });
    }

    /**
     * Creates a new process from the passed in process definition. This
     * method assumes that the process passed in is valid. Validation of
     * the process must be done outside of this method.
     *
     * @param {Object} process - The process definition to create the new
     *                           process from.
     * @returns {Object} - The new process created from the definition.
     */
    function *create(process) {
        let p = new model.Process(process.name, process.owner, process._type, process.what,
            process.why, process.does_transform, process.process_name);
        let proc = yield addProcess(process.project_id, p);
        let settings = yield addProcessSetup(proc.id, process.setup);
        yield addSampleMeasurements(proc.id, process.input_samples);
        yield addCreatedSamples(process.output_samples, process.project_id, proc.id, process.owner);
        yield addTransformedSamples(process.transformed_samples, proc.id);
        yield addFiles(proc.id, process.input_files, 'in');
        yield addFiles(proc.id, process.output_files, 'out');

        proc.settings = settings;
        return proc;
    }

    ///////////////// Module private methods /////////////////
    // addProcess inserts the process and add it to the project.
    function *addProcess(projectID, process) {
        let p = yield db.insert('processes', process);
        let p2proc = new model.Project2Process(projectID, p.id);
        yield db.insert('project2process', p2proc);
        return p;
    }

    // addProcessSetup adds the process setup settings
    function *addProcessSetup(processID, setup) {
        let settings = yield addSetupSettings(processID, setup.settings);
        let setupFiles = yield addSetupFiles(processID, setup.files);
        return {
            settings: settings,
            files: setupFiles
        };
    }

    // addSetupSettings will add each setting property for the process
    // to the database.
    function *addSetupSettings(processID, settings) {
        let created = [];
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
            setup.properties = [];
            for (let j = 0; j < current.properties.length; j++) {
                let p = current.properties[j].property;
                let prop = new model.SetupProperty(setup.id, p.name, p.description, p.attribute,
                    p._type, p.value, p.unit);
                let sprop = yield db.insert('setupproperties', prop);
                setup.properties.push(sprop);
            }
            created.push(setup);
        }
        return created;
    }

    // addSetupFiles adds the files used in setup to the database.
    function *addSetupFiles(processID, files) {
        let toAdd = [];
        files.forEach(file => {
            let p2sf = new model.Process2Setupfile(processID, file.id);
            toAdd.push(p2sf);
        });

        let created = [];
        if (toAdd.length !== 0) {
            created = yield db.insert('process2setupfile', toAdd);
        }
        return created;
    }


    /**
     * @name addSampleMeasurements
     * adds all the new measurements for an existing property in a sample.
     *
     * @param processID {String} - process id to add measurements to
     * @param samples {Array} - The samples to add
     * @returns {Array}
     */
    function *addSampleMeasurements(processID, samples) {
        for (let i = 0; i < samples.length; i++) {
            let sample = samples[i];
            let sampleID = sample.id;
            let samplePSetID = sample.property_set_id;

            let measurements = yield addExistingPropertyMeasurements(sampleID, sample.old_properties);
            yield addMeasurementsToProcess(processID, measurements);

            measurements = yield addNewPropertyMeasurements(sampleID, samplePSetID, sample.new_properties);
            yield addMeasurementsToProcess(processID, measurements);
            let proc2sample = new model.Process2Sample(processID, sampleID, samplePSetID, 'in');
            yield db.insert('process2sample', proc2sample);
            yield addSample2File(sampleID, sample.files);
        }
    }

    // addSetupFiles adds the files used in setup to the database.
    function *addSample2File(sampleID, files) {
        let toAdd = [];
        files.forEach(file => {
            let s2f = new model.Sample2Datafile(sampleID, file.id);
            toAdd.push(s2f);
        });

        let created = [];
        if (toAdd.length !== 0) {
            created = yield db.insert('sample2datafile', toAdd);
        }
        return created;
    }

    /**
     * Adds measurements to existing properties
     *
     * @name addExistingPropertyMeasurements
     * @param sampleID {String} - The sampleID to add existing new property measurements to.
     * @param properties {Array} - A list of existing properties with new measurements.
     * @returns {Array} - A list of the measurements that were added.
     */
    function *addExistingPropertyMeasurements(sampleID, properties) {
        let created = [];
        for (let i = 0; i < properties.length; i++) {
            let current = properties[i];
            let pID = current.property_id;
            let pName = current.name;
            let pAttr = current.attribute;
            let measurements = yield addPropertyMeasurements(pID, pName, pAttr, sampleID, current.measurements);
            created.push.apply(created, measurements);
        }
        return created;
    }

    /**
     * Adds new property to sample and adds its measurements to database.
     *
     * @name addNewPropertyMeasurements
     * @param sampleID
     * @param psetID
     * @param properties
     * @returns {Array} - A list of the measurements that were added.
     */
    function *addNewPropertyMeasurements(sampleID, psetID, properties) {
        let created = [];
        for (let i = 0; i < properties.length; i++) {
            let current = properties[i];
            let p = new model.Property(current.name, current.attribute);
            let inserted = yield db.insert('properties', p);
            let ps2p = new model.PropertySet2Property(inserted.id, psetID);
            yield db.insert('propertyset2property', ps2p);
            let measurements = yield addPropertyMeasurements(inserted.id, current.name, current.attribute,
                sampleID, current.measurements);
            created.push.apply(created, measurements);
        }
        return created;
    }

    /**
     * Adds all measurements for property to database.
     *
     * @name addPropertyMeasurements
     * @param pID {String} - The property ID.
     * @param pName {String} - The property name.
     * @param pAttr {String} - The property attribute.
     * @param sampleID {String} - The sample ID property is associated with.
     * @param measurements {Array} - A list of measurements taken on property.
     * @returns {Array} - A list of the new measurements that were added to the database.
     */
    function *addPropertyMeasurements(pID, pName, pAttr, sampleID, measurements) {
        let createdMeasurements = [];
        for (let i = 0; i < measurements.length; i++) {
            let current = measurements[i];
            let m = new model.Measurement(pName, pAttr, sampleID);
            m.value = current.value;
            m.unit = current.unit;
            m._type = current._type;
            m.element = current.element;
            let inserted = yield db.insert('measurements', m);
            createdMeasurements.push(inserted);
            yield addMeasurementToProperty(pID, inserted.id)
        }
        return createdMeasurements;
    }

    /**
     * Takes a measurement and associates it with the given property.
     *
     * @param {String} propID - The property id the measurement is for.
     * @param {String} mID - The measurement id.
     */
    function *addMeasurementToProperty(propID, mID) {
        let a2m = new model.Property2Measurement(propID, mID);
        yield db.insert('property2measurement', a2m);
    }


    /**
     * Adds measurements to the given process. This allows for tracking
     * which processes took which measurements.
     *
     * @param {String} processID - The process to associate the measurements with.
     * @param {Array} measurements - The measurements taken by this process.
     *
     */
    function *addMeasurementsToProcess(processID, measurements) {
        let p2ms = [];
        measurements.forEach(m => {
            let p2m = new model.Process2Measurement(processID, m.id);
            p2ms.push(p2m);
        });
        yield db.insert('process2measurement', p2ms);
    }

    /**
     * Inserts into the database the samples this process created. Updates dependencies such
     * as the project.
     * @param {Array} samples - Samples to create.
     * @param {String} projectID - The project the samples are being added.
     * @param {String} processID - The process that created the samples.
     * @param {String} owner - Owner of samples.
     * @returns {Array} - The created samples.
     */
    function *addCreatedSamples(samples, projectID, processID, owner) {
        let created = [];
        for (let i = 0; i < samples.length; i++) {
            let current = samples[i];
            let s = yield addNewSample(current.name, current.description, owner);
            yield addSampleAssociations(s.sample.id, s.asetID, projectID, processID);
            created.push(s.sample);
        }
        return created;
    }

    /**
     * Adds a new sample to the database and updates/creates all relationships.
     * @param {String} name - The name of the sample.
     * @param {String} description - Description of the sample.
     * @param {String} owner - Sample owner.
     * @returns {Object}  - The created sample.
     */
    function *addNewSample(name, description, owner) {
        let s = new model.Sample(name, description, owner);
        let sample = yield db.insert('samples', s);
        let aset = new model.PropertySet(true);
        let createdASet = yield db.insert('propertysets', aset);
        let s2as = new model.Sample2PropertySet(sample.id, createdASet.id, true);
        yield db.insert('sample2propertyset', s2as);
        return {
            sample: sample,
            asetID: createdASet.id
        };
    }

    /**
     * Creates all the other associations for a sample including mapping the sample
     * to the project it is in, and the process that created it.
     * @param {String} sampleID - The id of the created sample.
     * @param {String} asetID - The attribute set for the sample.
     * @param {String} projectID - The project to add sample id.
     * @param {String} processID - The process that created the sample.
     *
     */
    function *addSampleAssociations(sampleID, asetID, projectID, processID) {
        let proc2sample = new model.Process2Sample(processID, sampleID, asetID, 'out');
        let proj2sample = new model.Project2Sample(projectID, sampleID);
        yield db.insert('process2sample', proc2sample);
        yield db.insert('project2sample', proj2sample);
    }

    /**
     * Updates the database with transformed samples. A transformed sample is
     * one which has undergone a change such that some properties change their
     * values and must be re-measured.
     * @param {Array} samples - The samples that were transformed.
     * @param {String} processID - The process that performed the transformation.
     *
     */
    function *addTransformedSamples(samples, processID) {
        for (let i = 0; i < samples.length; i++) {
            let current = samples[i];
            let aset = new model.PropertySet(true, current.property_set_id);
            let asetCreated = yield db.insert('propertysets', aset);
            let s2ps = new model.Sample2PropertySet(current.sample_id, asetCreated.id, true);
            yield db.insert('sample2propertyset', s2ps);
            let oldPSetID = current.property_set_id;
            yield r.table('sample2propertyset').getAll(oldPSetID, {index: 'property_set_id'}).update({current: false});
            yield r.table('propertysets').getAll(oldPSetID).update({current: false});
            yield fillAttributeSet(asetCreated.id, current.shares, current.uses, current.unknowns);
            let proc2sample = new model.Process2Sample(processID, current.sample_id, asetCreated.id, 'out');
            yield db.insert('process2sample', proc2sample);
        }
    }

    /**
     *
     * @param {String} asetID - Attribute set to fill in.
     * @param {Array} shares - A list of attribute ids this attribute set shares.
     * @param {Array} unknowns - A list of attributes with unknown measurements.
     * @param {Array} uses - A list of attribute ids to use to create new attributes.
     */
    function *fillAttributeSet(asetID, shares, uses, unknowns) {
        yield fillFromShares(asetID, shares);
        yield fillFromUses(asetID, uses);
        yield fillFromUnknowns(asetID, unknowns);
    }

    /**
     * Create shared attributes. This method copies associates those
     * attributes with the given attribute set.
     * @param {String} psetID - The attribute set to add attributes to
     * @param {Array} shares - A list of attribute ids to associate with the attributeset.
     */
    function *fillFromShares(psetID, shares) {
        for (let i = 0; i < shares.length; i++) {
            let ps2p = new model.PropertySet2Property(shares[i], psetID);
            yield db.insert('propertyset2property', ps2p);
        }
    }

    /**
     * Create new attributes by using the given attributes as models.
     * @param {String} asetID - The attribute set to update
     * @param {Array} uses - A list of attributes to create new attributes from
     */
    function *fillFromUses(asetID, uses) {
        for (let i = 0; i < uses.length; i++) {
            let attrID = uses[i];

            // Get the attribute we are going to copy
            let attr = yield r.table('properties').get(attrID);

            // Save this attributes id for later use.
            let origID = attr.id;

            // Use as template for new attribute
            //attr.id = '';
            delete attr['id'];
            attr.birthtime = r.now();
            attr.mtime = attr.birthtime;

            // Now insert new attribute
            let newAttr = yield db.insert('properties', attr);

            // Attach all dependent tables and joins.
            yield attachDependencies(newAttr.id, origID);

            // Add new attribute to process that measured the
            // attribute? Need to talk with Brian about this one.
            // TODO: Talk to Brian about above.

            // Add to attribute set
            let as2a = new model.PropertySet2Property(newAttr.id, asetID);
            yield db.insert('propertyset2property', as2a);
        }
    }

    /**
     * Create new attributes with no measurements.
     * @param {String} psetID - The attribute set to update
     * @param {Array} unknowns - A list of attributes to create new attributes
     */
    function *fillFromUnknowns(psetID, unknowns) {
        for (let i = 0; i < unknowns.length; i++) {
            let attrID = unknowns[i];

            // Get the attribute
            let attr = yield r.table('properties').get(attrID);

            // Use as template for new attribute
            delete attr['id'];
            attr.birthtime = r.now();
            attr.mtime = attr.birthtime;
            attr.best_measure_id = '';

            // Now insert new attribute
            let newAttr = yield db.insert('properties', attr);

            // Add to attribute set
            let as2a = new model.PropertySet2Property(newAttr.id, psetID);
            yield db.insert('propertyset2property', as2a);
        }
    }

    /**
     * Creates and attaches the new measurements and best measure history
     * for the new attribute by copying over from the original attribute.
     * @param {String} newAttrID - The new attribute
     * @param {String} fromAttrID - The attribute the new one came from
     */
    function *attachDependencies(newAttrID, fromAttrID) {
        yield attachMeasurements(newAttrID, fromAttrID);
        yield attachBestMeasureHistory(newAttrID, fromAttrID);
    }

    /**
     * Creates a new set of measurements for the new attribute by
     * copying over the original attributes measurements, changing the
     * property_id to the new attributes id, and inserting.
     * @param {String} newAttrID - The new attribute
     * @param {String} fromAttrID - The attribute the new one came from
     */
    function *attachMeasurements(newAttrID, fromAttrID) {
        // Get original attributes measurements
        let rql = r.table('property2measurement').getAll(fromAttrID, {index: 'property_id'});
        let original = yield rql;
        // Change id to newAttrID and insert into table
        original.forEach(function (m) {
            m.property_id = newAttrID;
            delete m['id'];
        });
        yield db.insert('property2measurement', original);
    }

    /**
     * Creates a new best measure history for the new attribute by
     * copying over the original attributes history, changing the
     * property_id to the new attributes id, and inserting.
     * @param {String} newAttrID - The new attribute
     * @param {String} fromAttrID - The attribute the new one came from
     */
    function *attachBestMeasureHistory(newAttrID, fromAttrID) {
        // Get original attributes best measure history
        let rql = r.table('best_measure_history').getAll(fromAttrID, {index: 'property_id'});
        let original = yield rql;

        // Change to newAttrID and insert
        original.forEach(function (entry) {
            entry.property_id = newAttrID;
            delete entry['id'];
        });
        yield db.insert('best_measure_history', original);
    }

    /**
     * @name addFiles
     * @description Adds the files that were produced by the process.
     * @param {String} processID - Process to add files to
     * @param {Array} files - A list of files ids to associate with the process
     * @param direction
     * @return {*}
     */
    function *addFiles(processID, files, direction) {
        let addTo = [];
        for (let i = 0; i < files.length; i++) {
            let p2of = new model.Process2File(processID, files[i].id, direction);
            addTo.push(p2of);
        }
        return yield db.insert('process2file', addTo);
    }
};
