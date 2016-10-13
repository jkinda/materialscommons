module.exports = function(r) {
    const _ = require('lodash');
    const getSingle = require('./get-single');
    const model = require('./model')(r);

    return {
        getUsers: getUsers,
        getUser: getUser,
        get: function(id, index) {
            return getSingle(r, 'users', id, index);
        },
        updateProjectFavorites,
        updateUserSettings,
        userHasProjectAccess,
        createUnverifiedAccount,
        createPasswordResetRequest,
        getUserRegistrationFromUuid
    };

    ///////////

    // getUsers returns all the users in the database.
    function getUsers() {
        return r.table('users').run();
    }

    // getUser gets the user by index. If no index is given then it
    // uses the primary key.
    function* getUser(id, index) {
        if (index) {
            let matches = yield r.table('users').getAll(id, {index: index}).run();
            if (matches.length !== 0) {
                return matches[0];
            }
            return null;
        }
        return yield r.table('users').get(id).run();
    }

    function* updateProjectFavorites(userID, projectID, attrs) {
        if (attrs.favorites) {
            // TODO: validate the projectID exists
            let user = yield r.table('users').get(userID);
            if (!user.favorites) {
                user.favorites = {};
            }

            if (!(projectID in user.favorites)) {
                user.favorites[projectID] = {
                    processes: []
                };
            }

            let toAdd = attrs.favorites.processes.filter(p => p.command === 'add').map(p => p.name);
            let toDelete = attrs.favorites.processes.filter(p => p.command === 'delete').map(p => p.name);
            let projProcesses = user.favorites[projectID].processes;
            // remove deleted process favorites
            projProcesses = projProcesses.filter(p => _.indexOf(toDelete, name => name == p, null) === -1);
            let toAddFavs = _.difference(toAdd, projProcesses);
            user.favorites[projectID].processes = projProcesses.concat(toAddFavs);
            yield r.table('users').get(userID).update({favorites: user.favorites});
        }
        return yield r.table('users').get(userID).without('admin', 'apikey', 'password');
    }

    function* updateUserSettings(userId, settings) {
        yield r.table('users').get(userId).update(settings);
        let user = yield r.table('users').get(userId).without('admin', 'apikey', 'password');
        return {val: user};
    }

    function* userHasProjectAccess(userId, projectId) {
        let accessEntries = yield r.table('access').getAll([userId, projectId], {index: 'user_project'});
        return accessEntries.length !== 0;
    }

    function* createPasswordResetRequest(user) {
        let validate_uuid = yield r.uuid();
        let validate_doc = {
            id: user.id,
            email: user.email,
            fullname: user.fullname,
            validate_uuid: validate_uuid,
            reset_password:true
        };
        let accountRequest = yield r.table('account_requests').get(user.id);
        if (accountRequest) {
            let update = yield r.table('account_requests').get(user.email)
                .update(validate_doc, {returnChanges: true});
            return {val: update.changes[0].new_val};
        }
        let rv = yield r.table('account_requests').insert(validate_doc, {returnChanges: true});
        return {val: rv.changes[0].new_val};
    }

    function* clearResetPassword(userId) {
        let user = yield r.table('users').get(userId).replace(r.row.without('key'));
    }

    function* createUnverifiedAccount(account) {
        let apikey = yield r.uuid(),
            user = new model.User(account.email, account.fullname, apikey.replace(/-/g, ''));
        user.validate_uuid = yield r.uuid();
        let u = yield r.table('users').get(account.email);
        if (u) {
            return {error: "User account already exists: " + account.email};
        }
        let rv = yield r.table('account_requests').insert(user, {returnChanges: true});
        if (rv.errors) {
            return {error: "Validation was already sent: " + account.email};
        }

        return {val: rv.changes[0].new_val};
    }

    function* getUserRegistrationFromUuid(uuid) {
        let results = yield r.table('account_requests').getAll(uuid, {index: 'validate_uuid'});
        if (!results.length) {
            return {error: "User validation record does not exists: " + uuid};
        }
        let registration = results[0];
        delete registration['password'];
        delete registration['apikey'];
        return {val: registration};
    }


};
