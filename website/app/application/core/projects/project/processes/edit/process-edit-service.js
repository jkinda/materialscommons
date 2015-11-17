(function (module) {
    module.factory("processEdit", processEdit);
    processEdit.$inject = [];

    function processEdit() {
        /**
         * fillSetUp: will read all the setup values from process
         * and place inside template.
         *
         */
        function setUp(template, process) {
            process.setup[0].properties.forEach(function (property) {
                var i = _.indexOf(template.setup.settings[0].properties, function (template_property) {
                    return template_property.property.attribute === property.attribute
                });
                if (i > -1) {
                    template.setup.settings[0].properties[i].property.value = property.value;
                    template.setup.settings[0].properties[i].property.name = property.name;
                    template.setup.settings[0].properties[i].property.description = property.description;
                    template.setup.settings[0].properties[i].property.unit = property.unit;
                    template.setup.settings[0].properties[i].property.id = property.id;
                    template.setup.settings[0].properties[i].property.setup_id = property.setup_id;
                    template.setup.settings[0].properties[i].property._type = property._type;
                    template.setup.settings[0].properties[i].property.attribute = property.attribute;
                }
            });
            process.setup = template.setup;
            return process;
        }

        function samples(process) {
            process.input_samples = process.input_samples.map(function (sample) {
                return {
                    id: sample.id,
                    name: sample.name,
                    property_set_id: sample.property_set_id,
                    files: sample.linked_files
                }
            });
            return process;
        }

        function files(process) {
            process['input_files'] = process.input_files.map(function (file) {
                return {id: file.id, name: file.name}
            });
            process['output_files'] = process.output_files.map(function (file) {
                return {id: file.id, name: file.name}
            });
            return process;
        }

        return {
            fillProcess: function (template, process) {
                process = setUp(template, process);
                process = samples(process);
                process = files(process);
                return process;
            },

            addToSamplesFiles: function (files, process) {
                files.forEach(function (f) {
                    var i = _.indexOf(process.samples_files, function (item) {
                        return f.id === item.id && f.sample_id == item.sample_id;
                    });
                    if (i !== -1) {
                        process.samples_files.splice(i, 1);
                        process.samples_files.push({
                            id: f.id,
                            command: f.command,
                            name: f.name,
                            sample_id: f.sample_id
                        });
                    } else {
                        if (f.command) {
                            process.samples_files.push({
                                id: f.id,
                                command: f.command,
                                name: f.name,
                                sample_id: f.sample_id
                            });
                        }
                    }
                });
                return process;
            },

            refreshSample: function (files, sample) {
                files.forEach(function (f) {
                    if (f.command) {
                        var i = _.indexOf(sample.files, function (item) {
                            return f.id === item.id && f.sample_id == sample.id;
                        });
                        if (i !== -1) {
                            sample.files.splice(i, 1);
                            if (!(f.command === 'delete')) {
                                sample.files.push({id: f.id, command: f.command, name: f.name, linked: f.linked});
                            }
                        } else {
                            if (!(f.command === 'delete')) {
                                sample.files.push({id: f.id, command: f.command, name: f.name, linked: f.linked});
                            }
                        }
                    }
                });
                return sample;
            }
        };
    }
}(angular.module('materialscommons')));
