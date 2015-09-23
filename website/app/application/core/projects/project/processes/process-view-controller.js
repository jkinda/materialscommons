(function (module) {
    module.controller('projectViewProcess', projectViewProcess);
    projectViewProcess.$inject = ["project", "mcfile", "$stateParams", "modalInstance", "$state",
        "mcapi", "process"];

    function projectViewProcess(project, mcfile, $stateParams, modalInstance, $state, mcapi, process) {
        var viewCtrl = this;
        console.log('inside');
        console.dir(process);
        viewCtrl.openSample = openSample;
        viewCtrl.openFile = openFile;
        viewCtrl.editProvenance = editProvenance;
        viewCtrl.images = images;
        viewCtrl.fileSrc = fileSrc;
        viewCtrl.isSet = isSet;
        viewCtrl.setTab = setTab;

        viewCtrl.project = project;
        viewCtrl.tab = 'setup';
        viewCtrl.process = process;
         console.dir(viewCtrl.process);

        function setTab(tabId) {
            viewCtrl.tab = tabId;
        }

        function isSet(tabId) {
            return viewCtrl.tab === tabId;
        }

        function fileSrc(id) {
            return mcfile.src(id);
        }

        function openSample(sample) {
            modalInstance.openModal(sample, 'sample', viewCtrl.project);
        }

        function openFile(file) {
            modalInstance.openModal(file, 'datafile', viewCtrl.project);
        }

        function editProvenance() {
            $state.go('projects.project.processes.list.edit', {process_id: viewCtrl.current.id});
        }

        //function getSampleDetails(process) {
        //    if (process.samples.length !== 0) {
        //        mcapi('/samples')
        //            .success(function (samples) {
        //                viewCtrl.current.samples = samples;
        //            })
        //            .error(function (err) {
        //                console.log(err);
        //            })
        //            .post({samples: process.samples});
        //    }
        //}

        function images(files) {
            var images = [];
            if (files){
                files.forEach(function (f) {
                    if (isImage(f.mediatype.mime)) {
                        images.push(f);
                    }
                });
            }
            return images;
        }

        //function init() {
        //    var i = _.indexOf(viewCtrl.project.processes, function (process) {
        //        return process.id === $stateParams.process_id;
        //    });
        //
        //    if (i > -1) {
        //        viewCtrl.current = viewCtrl.project.processes[i];
        //        //getSampleDetails(viewCtrl.current);
        //    }
        //
        //}
        //
        //init();


    }
}(angular.module('materialscommons')));

;