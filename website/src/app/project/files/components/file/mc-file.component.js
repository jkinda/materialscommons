angular.module('materialscommons').component('mcFile', {
    template: require('./mc-file.html'),
    controller: MCFileComponentController
});

function MCFileComponentController(projectsAPI, $stateParams) {
    'ngInject';

    var ctrl = this;
    projectsAPI.getProjectFile($stateParams.project_id, $stateParams.file_id).then(
        (file) => {
            ctrl.file = file;
        }
    );
}
