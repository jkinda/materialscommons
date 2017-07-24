angular.module('materialscommons').component('mcExperimentTasks', {
    templateUrl: 'app/project/experiments/experiment/components/tasks/mc-experiment-tasks.html',
    controller: MCExperimentTasksComponentController
});

/*@ngInject*/
function MCExperimentTasksComponentController($scope, moveTask, mcstate, blankTaskService, $mdDialog) {
    let ctrl = this;
    ctrl.show = 'note';

    ctrl.filterBy = {flags: {done: false}};

    ctrl.$onInit = () => {
        ctrl.currentNode = null;
        ctrl.experiment = mcstate.get(mcstate.CURRENT$EXPERIMENT);
        ctrl.experiment.tasks[0].displayState.selectedClass = 'task-selected';
        mcstate.set(mcstate.CURRENT$TASK, ctrl.experiment.tasks[0]);
        ctrl.currentTask = mcstate.get(mcstate.CURRENT$TASK);
        mcstate.subscribe(mcstate.CURRENT$TASK, 'MCExperimentTasksComponentController',
            () => {
                ctrl.currentTask = mcstate.get(mcstate.CURRENT$TASK);
            });
    };

    ctrl.addTask = () => {
        let node = mcstate.get(mcstate.CURRENT$NODE),
            task = mcstate.get(mcstate.CURRENT$TASK);
        blankTaskService.addBlankTask(node, task);
    };

    ctrl.addQuickNote = () => {
        $mdDialog.show({
            templateUrl: 'app/project/experiments/experiment/components/tasks/quick-note-dialog.html',
            controller: CreateExperimentQuickNoteDialogController,
            controllerAs: '$ctrl',
            bindToController: true,
            locals: {
                experiment: ctrl.experiment
            }
        });
    };

    ctrl.toggleFilter = (filter, event) => {
        let setFlag = false;
        if (_.has(ctrl.filterBy.flags, filter)) {
            // The done flag is treated specially as, by default, we don't show
            // done items.
            if (filter === 'done') {
                ctrl.filterBy.flags.done = !ctrl.filterBy.flags.done;
                setFlag = ctrl.filterBy.flags.done;
            } else {
                delete ctrl.filterBy.flags[filter];
            }
        } else {
            setFlag = true;
            ctrl.filterBy.flags[filter] = true;
        }

        switch (filter) {
            case "done":
                toggleFilterIcon(setFlag, event, 'fa-check-square', 'fa-check-square-o');
                break;
            case "starred":
                toggleFilterIcon(setFlag, event, 'fa-star', 'fa-star-o');
                break;
            case "flagged":
                toggleFilterIcon(setFlag, event, 'fa-flag', 'fa-flag-o');
                break;
        }
    };

    function toggleFilterIcon(isSet, event, setClass, unsetClass) {
        if (isSet) {
            $(event.target).removeClass(unsetClass);
            $(event.target).addClass(setClass);
        } else {
            $(event.target).removeClass(setClass);
            $(event.target).addClass(unsetClass);
        }
    }

    let currentTask = () => mcstate.get(mcstate.CURRENT$TASK);

    ctrl.moveLeft = () => moveTask.left(ctrl.currentNode, currentTask(), ctrl.experiment);
    ctrl.moveRight = () => moveTask.right(ctrl.currentNode, currentTask());
    ctrl.moveUp = () => moveTask.up(ctrl.currentNode, currentTask());
    ctrl.moveDown = () => moveTask.down(ctrl.currentNode, currentTask(), ctrl.experiment);
    ctrl.expandAll = () => $scope.$broadcast('angular-ui-tree:expand-all');
    ctrl.collapseAll = () => $scope.$broadcast('angular-ui-tree:collapse-all');
    ctrl.showTaskMaximized = () => {
        if (!currentTask()) {
            return false;
        }
        return currentTask().displayState.maximize;
    };
    ctrl.getCurrentTask = () => currentTask();
}

class CreateExperimentQuickNoteDialogController {

    /*@ngInject*/
    constructor($mdDialog, $scope, editorOpts, notesAPI, $stateParams, toast) {
        this.$mdDialog = $mdDialog;
        $scope.editorOptions = editorOpts({height: 40, width: 55});
        this.note = {
            name: " ",
            note: " "
        };
        this.noteCreated = false;
        this.noteId = "";
        this.notesAPI = notesAPI;
        this.projectId = $stateParams.project_id;
        this.experimentId = $stateParams.experiment_id;
        this.toast = toast;
    }

    /*
     * updateNote uses this.noteCreated to determine if the note needs to be created rather than updated.
     * If the note is in the process of being created then this.noteId will equal "", and an update to the
     * note will not occur. Once it has been created updates will start being made to the note.
     */
    updateNote() {
        let note = {
            note: this.note.note ? this.note.note : " ",
            name: this.note.name ? this.note.name : " "
        };

        if (!this.noteCreated) {
            this.notesAPI.createNote(this.projectId, this.experimentId, note)
                .then(
                    (n) => {
                        this.noteId = n.id;
                        this.note = n;
                        this.noteCreated = true;
                        this.experiment.notes.push(n);
                    },
                    () => this.toast.error('Failed to create note')
                );
        } else if (this.noteId !== "") {
            this.notesAPI.updateNote(this.projectId, this.experimentId, this.noteId, note)
                .then(
                    () => null,
                    () => this.toast.error('Unable to update note')
                );
        }
    }

    done() {
        this.$mdDialog.hide();
    }
}

