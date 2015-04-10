/*
 * The Projects service acts as a cache for projects and their files. It provides routines
 * for manipulating the selected flag in the list of files in a project, as well as channel
 * that controllers, directives and services can set to receive events on.
 */
Application.Services.factory('projectFiles', ['pubsub', projectFilesService]);
function projectFilesService(pubsub) {
    var service = {
        model: {
            projects: {}
        },
        channel: null,
        activeByProject: {},
        activeFile: {},

        setActive: function (projectID, active) {
            service.activeByProject[projectID] = active;
        },

        isActive: function (projectID) {
            if (!(projectID in service.activeByProject)) {
                service.activeByProject[projectID] = false;
            }

            return service.activeByProject[projectID];
        },

        /*
         * Clears the current set of projects.
         */
        clear: function () {
            service.model.projects = {};
        },

        /*
         * Sets the channel used to publish events to.
         */
        setChannel: function (what) {
            service.channel = what;
        },

        /*
         * Clears the selected flag on all files in the project.
         */
        clearSelectedFiles: function (projectId) {
            var treeModel = new TreeModel(),
                root = treeModel.parse(service.model.projects[projectId].dir);
            root.walk({strategy: 'pre'}, function (node) {
                node.model.selected = false;
            });
        },

        /*
         * Walks the projects file tree and sets the selected flag to true for
         * all files found in the files list all other files selected flag
         * is set to false.
         */
        resetSelectedFiles: function (files, projectId) {
            var filesHash = {},
                treeModel = new TreeModel(),
                root = treeModel.parse(service.model.projects[projectId].dir);

            files.forEach(function (fileEntry) {
                filesHash[fileEntry.id] = fileEntry;
            });

            root.walk({strategy: 'pre'}, function (node) {
                if (filesHash.hasOwnProperty(node.model.id)) {
                    node.model.selected = true;
                } else {
                    node.model.selected = false;
                }
            });
        },

        /*
         * Sets the selected flag to true for all files listed in files.
         */
        setFilesSelected: function (files, projectId) {
            if (files.length === 0) {
                return;
            }

            var filesHash = {},
                treeModel = new TreeModel(),
                root = treeModel.parse(service.model.projects[projectId].dir);

            files.forEach(function (fileEntry) {
                filesHash[fileEntry.id] = fileEntry;
            });

            root.walk({strategy: 'pre'}, function (node) {
                if (filesHash.hasOwnProperty(node.model.id)) {
                    node.model.selected = true;
                }
            });
        },

        // Sets up a list of files by mediatype. The type "all" is used to
        // list all files in a project.
        loadByMediaType: function (project) {
            service.model.projects[project.id].byMediaType = {};
            var byMediaType = service.model.projects[project.id].byMediaType;
            byMediaType.all = [];
            for (var mediatype in project.mediatypes) {
                byMediaType[mediatype] = [];
            }
            byMediaType.unknown = [];
            var treeModel = new TreeModel(),
                root = treeModel.parse(service.model.projects[project.id].dir);
            root.walk({strategy: 'pre'}, function(node) {
                if (node.model.type !== "datadir") {
                    node.model.showDetails = false;
                    byMediaType.all.push(node.model);
                    if (node.model.mediatype === "") {
                        byMediaType.unknown.push(node.model);
                    } else if (!(node.model.mediatype in byMediaType)) {
                       // byMediaType[node.model.mediatype] = [];
                        //byMediaType[node.model.mediatype].push(node.model);
                    } else {
                        byMediaType[node.model.mediatype].push(node.model);
                    }
                }
            });
        },

        setActiveFile: function (what) {
            service.activeFile = what;
            pubsub.send('activeFile.change');
        },
        getActiveFile: function () {
            return service.activeFile;
        }


    };
    return service;
}
