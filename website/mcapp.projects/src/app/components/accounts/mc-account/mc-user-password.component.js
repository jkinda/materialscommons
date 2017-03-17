angular.module('materialscommons').component('mcUserPassword', {
    templateUrl: 'app/components/accounts/mc-account/mc-user-password.html',
    controller: MCUserPasswordComponentController
});

/*@ngInject*/
function MCUserPasswordComponentController(mcapi, User, toast, focus) {
    const ctrl = this;
    ctrl.newPassword = null;
    ctrl.verifyNewPassword = null;
    //focus('inputPassword');

    ctrl.changePassword = changePassword;
    ctrl.cancel = cancel;

    //////////////

    function changePassword() {
        if (ctrl.newPassword) {
            if (ctrl.newPassword === ctrl.verifyNewPassword) {
                mcapi('/user/%/password', User.u(), ctrl.newPassword)
                    .success(function() {
                        toast.success('Password updated successfully', 'top left');
                        resetPasswordFields();
                    })
                    .error(function(data) {
                        toast.error('Unable to update password: ' + data.error, 'top left');
                        resetPasswordFields();
                    }).put({password: ctrl.newPassword});
            } else {
                toast.error('Passwords do not match.', 'top left');
                resetPasswordFields();
            }
        }
    }

    function resetPasswordFields() {
        focus('inputPassword');
        ctrl.newPassword = '';
        ctrl.verifyNewPassword = '';
    }

    function cancel() {
    }
}