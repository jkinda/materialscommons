class MCProcessTemplateSamplesListComponentController {
    /*@ngInject*/
    constructor(processesService, toast, $stateParams, sampleLinker, processEdit) {
        this.processesService = processesService;
        this.toast = toast;
        this.projectId = $stateParams.project_id;
        this.sampleLinker = sampleLinker;
        this.processEdit = processEdit;
    }

    removeSample(s) {
        let sampleArg = {
            id: s.id,
            property_set_id: s.property_set_id
        };
        this.processesService.updateSamplesInProcess(this.projectId, this.process.id, [], [sampleArg]).then(
            () => this.removeSampleFromProcess(s),
            () => this.toast.error('Unable to remove file from process')
        );
    }

    linkFilesToSample(sample) {
        console.log('linkFilesToSample');
        this.sampleLinker.linkFilesToSample(sample, this.process.files, []).then(
            (linkedFiles) => {
                console.log('linkedFiles', linkedFiles);
                //sample = this.processEdit.refreshSample(linkedFiles, sample);
            }
        );
    }

    removeSampleFromProcess(sample) {
        this.removeFromSampleList(sample, 'input_samples');
        this.removeFromSampleList(sample, 'output_samples');
        this.mcProcessesWorkflow.onChange();
    }

    removeFromSampleList(sample, list) {
        let i = _.findIndex(this.process[list], (s) => s.id === sample.id && s.property_set_id === sample.property_set_id);
        if (i !== -1) {
            this.process[list].splice(i, 1);
        }
    }
}

angular.module('materialscommons').component('mcProcessTemplateSamplesList', {
    templateUrl: 'app/global.components/process/mc-process-template-samples-list.html',
    controller: MCProcessTemplateSamplesListComponentController,
    bindings: {
        process: '='
    },
    require: {
        mcProcessesWorkflow: '^mcProcessesWorkflow'
    }
});