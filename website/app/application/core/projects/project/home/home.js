Application.Controllers.controller('projectHome',
    ["$scope", "project", "User", "mcapi", "Events", "uiCalendarConfig", "$compile", "$timeout", projectHome]);

function projectHome($scope, project, User, mcapi, Events, uiCalendarConfig, $compile, $timeout) {
    $scope.updateName = function () {
        mcapi('/users/%', $scope.mcuser.email)
            .success(function (u) {
                $scope.editFullName = false;
                User.save($scope.mcuser);
            }).put({fullname: $scope.mcuser.fullname});
    };

    $scope.project = project;
    $scope.mcuser = User.attr();
    $scope.project = Events.addConvertedTime($scope.project);

    $scope.event_reviews = {
        color: '#4884b8',
        events: Events.prepareCalendarEvent($scope.project.reviews)
    };
    $scope.event_notes = {
        color: '#3ea7a0',
        events: Events.prepareCalendarEvent($scope.project.notes)
    };
    $scope.event_processes = {
        color: '#e26a6a',
        events: Events.prepareCalendarEvent($scope.project.processes)
    };
    $scope.event_samples = {
        color: '#f0ad4e',
        events: Events.prepareCalendarEvent($scope.project.samples)
    };

    var  previous = '';
    $scope.alertOnDayClick = function (date, jsEvent, view) {
        if (previous !== ''){
            previous.css('background-color', '');
        }
        $(this).css('background-color', 'lightgrey');
        var d = date._d;
        var clicked_date = Date.UTC(d.getUTCFullYear(), (d.getUTCMonth()), d.getUTCDate());
        var day = d.getUTCDate()+1;
        var next_date = Date.UTC(d.getUTCFullYear(), (d.getUTCMonth()), day);
        $scope.project = Events.updateDate($scope.project, clicked_date, next_date);
        previous = $(this);
    };

    $scope.alertOnEventClick = function(event, jsEvent, view){
        var date = event.start;
        $scope.alertOnDayClick(date, jsEvent, view);
    };

    $scope.changeView = function (view, calendar) {
        uiCalendarConfig.calendars[calendar].fullCalendar('changeView', view);
    };

    $scope.eventRender = function( event, element, view ) {
        $timeout(function(){
            $(element).attr('tooltip', event.description);
            $compile(element)($scope);
        });
    };

    $scope.eventSources = [$scope.event_reviews, $scope.event_notes, $scope.event_processes, $scope.event_samples];

    $scope.uiConfig = {
        calendar: {
            height: 450,
            editable: true,
            header: {
                left: 'title',
                center: '',
                right: 'today prev,next'
            },
            dayClick: $scope.alertOnDayClick,
            eventClick: $scope.alertOnEventClick,
            eventRender: $scope.eventRender
        }
    };
}
