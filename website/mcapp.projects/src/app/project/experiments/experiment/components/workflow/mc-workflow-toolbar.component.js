class MCWorkflowToolbarComponentController {
    /*@ngInject*/
    constructor(workflowService, workflowFiltersService, $timeout, $mdDialog, $stateParams, mcstate, mcbus) {
        this.myName = "mcWorkflowToolbar";
        this.workflowService = workflowService;
        this.workflowFiltersService = workflowFiltersService;
        this.$timeout = $timeout;
        this.selectedProcess = null;
        this.$mdDialog = $mdDialog;
        this.mcstate = mcstate;
        this.projectId = $stateParams.project_id;
        this.experimentId = $stateParams.experiment_id;
        this.mcbus = mcbus;
        this.query = '';
        this.showingWorkflowGraph = true;
    }


    $onInit() {
        let cb = (selected) => this.$timeout(() => this.selectedProcess = selected);
        this.mcstate.subscribe(this.mcstate.SELECTED$PROCESS, this.myName, cb);
    }

    $onDestroy() {
        this.mcstate.leave(this.mcstate.SELECTED$PROCESS, this.myName);
    }

    addProcess() {
        this.$mdDialog.show({
            templateUrl: 'app/project/experiments/experiment/components/workflow/mc-process-templates-dialog.html',
            controller: SelectProcessTemplateDialogController,
            controllerAs: '$ctrl',
            bindToController: true,
            multiple: true
        });
    }

    cloneProcess() {
        this.workflowService.cloneProcess(this.projectId, this.experimentId, this.selectedProcess);
    }

    deleteProcess() {
        this.workflowService.deleteNodeAndProcess(this.projectId, this.experimentId, this.selectedProcess.id);
        this.selectedProcess = null;
    }

    search() {
        this.mcstate.set('WORKFLOW$SEARCH', this.query);
    }

    reset() {
        this.query = '';
        this.mcbus.send('WORKFLOW$RESET');
    }

    toggleNavigator() {
        this.mcbus.send('WORKFLOW$NAVIGATOR');
    }

    showWorkflowGraph() {
        this.showingWorkflowGraph = true;
        this.mcbus.send('WORKFLOW$VIEW', 'graph');
    }

    showWorkflowOutline() {
        this.showingWorkflowGraph = false;
        this.mcbus.send('WORKFLOW$VIEW', 'outline');
    }

    filterBySamples() {
        this.workflowFiltersService.filterBySamples(this.projectId, this.experimentId);
    }
}

class SelectProcessTemplateDialogController {
    /*@ngInject*/
    constructor($stateParams, $mdDialog, workflowService) {
        this.$mdDialog = $mdDialog;
        this.projectId = $stateParams.project_id;
        this.experimentId = $stateParams.experiment_id;
        this.workflowService = workflowService;
        this.keepOpen = false;
    }

    addSelectedProcessTemplate(templateId) {
        this.workflowService.addProcessFromTemplate(templateId, this.projectId, this.experimentId, this.keepOpen)
    }

    done() {
        this.$mdDialog.hide();
    }

}

angular.module('materialscommons').component('mcWorkflowToolbar', {
    templateUrl: 'app/project/experiments/experiment/components/workflow/mc-workflow-toolbar.html',
    controller: MCWorkflowToolbarComponentController
});
