class MCJoinValidateComponentController {
    /*@ngInject*/
    constructor(accountsService, $stateParams, $state, $timeout) {
        this.uuid = $stateParams.validation_uuid;
        this.accountsService = accountsService;
        this.$state = $state;
        this.message = null;
        this.password1 = '';
        this.password2 = '';
        this.showSuccessMsg = false;
        this.$timeout = $timeout;
    }

    $onInit() {
        this.accountsService.getUserRegistrationAccount(this.uuid)
            .then(
                (registration) => {
                    console.log("registration: ", registration);
                    this.registration = registration;
                },
                (e) => this.message = e.data.error
            );
    }

    setPassword(setPasswordForm) {
        if (!registration) {
            this.message = "No validated user request. Please retry.";
            return;
        }

        if (setPasswordForm.$invalid) {
            return;
        }

        if (!this.allFieldsValid()) {
            return;
        }

        console.log('client mc-join-validate setPassword',this.uuid,this.password1);
        console.log('  reset_password', this.registration.reset_password);

        if (this.registration.reset_password) {
            this.accountsService.resetUserPasswordWithValidate(this.uuid,this.registration.id,this.password1)
                .then(
                    () => {
                        this.showSuccessMsg = true;
                        this.$timeout(() => this.$state.go('login'), 5000);
                    },
                    (e) => this.message = `${e.data.error}`
                );
        } else {
            this.accountsService.setUserFromRegistrationData(this.uuid, this.password1)
                .then(
                    () => {
                        this.showSuccessMsg = true;
                        this.$timeout(() => this.$state.go('login'), 5000);
                    },
                    (e) => this.message = `${e.data.error}`
                );
        }
    }


    allFieldsValid() {
        if (this.password1 === '' || this.password2 === '') {
            this.message = 'Both fields are required';
            return false;
        }
        if (this.password1 !== this.password2) {
            this.message = "Password entries do not match";
            return false;
        }
        if (this.password1.length < 6) {
            this.message = "Password must be at least 6 character in length";
            return false;
        }
        this.message = null;
        return true;
    }
}

angular.module('materialscommons').component('mcJoinValidate', {
    templateUrl: 'app/join/mc-join-validate.html',
    controller: MCJoinValidateComponentController
});
