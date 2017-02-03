class MCUserFullnameComponentController {
    /*@ngInject*/
    constructor(User, toast) {
        this.User = User;
        this.toast = toast;
        this.fullname = User.attr().fullname;
    }

    updateFullname() {
        this.User.updateFullname(this.fullname).then(
            () => this.toast.success('Name updated', 'bottom left'),
            () => this.toast.error('Unable to update name', 'bottom left')
        );
    }
}

angular.module('materialscommons').component('mcUserFullname', {
    templateUrl: 'app/user/components/mc-user-fullname.html',
    controller: MCUserFullnameComponentController
});