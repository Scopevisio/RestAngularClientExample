var app = angular.module('webApi', ['ngRoute', 'ngResource', 'jsonFormatter', 'ngTable', 'angucomplete-alt', '720kb.datepicker']);

// The router of the angular app.
app.config(function ($httpProvider, $routeProvider) {

    $httpProvider.interceptors.push('HttpInterceptor');

    $routeProvider
      .when('/', {
          templateUrl: 'fragments/main.html',
          controller: 'mainService'
      })
      .when('/contacts', {
          templateUrl: 'fragments/contacts.html',
          controller: 'contactsService'
      })
      .when('/contactsdetails', {
          templateUrl: 'fragments/contactsdetails.html',
          controller: 'contactDetailService'
      })
      .when('/projects', {
          templateUrl: 'fragments/projects.html',
          controller: 'projectsService'
      })
      .when('/projectsdetails', {
          templateUrl: 'fragments/projectsdetails.html',
          controller: 'projectServiceDetails'
      })
      .when('/tasks', {
          templateUrl: 'fragments/tasks.html',
          controller: 'taskService'
      })
      .when('/tasksdetails', {
                templateUrl: 'fragments/tasksdetails.html',
                controller: 'taskServiceDetails'
      })
      .when('/teamwork', {
                templateUrl: 'fragments/teamwork.html',
                controller: 'teamworkService'
      })
      .when('/searchscope', {
                      templateUrl: 'fragments/searchscope.html',
                      controller: 'searchService'
      })
      .when('/documentation', {
                      templateUrl: 'fragments/documentation.html',
                      controller: 'documentationService'
      })
      .otherwise({
          redirectTo: '/'
      });
});

// See if image exist.
app.directive('checkImage', function ($q) {
    // check if the anchor source actually exist.
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            // We check the ngSrc to see any changes, once set we check if there is a 404, 402, etc.
            attrs.$observe('ngSrc', function (ngSrc) {
                var deferred = $q.defer();
                var image = new Image();
                // if returned a 404, 40x we use the default asset.
                image.onerror = function () {
                    deferred.resolve(false);
                    element.attr('src', "assets/default_person.svg"); // set default image
                };
                // if everything worked, we resolve it.
                image.onload = function () {
                    deferred.resolve(true);
                };
                image.src = ngSrc;
                return deferred.promise;
            });
        }
    };
});



// Using the interceptor to limit the app.
app.factory('HttpInterceptor', function($injector, $q) {
    return {

        'request': function(config) {
            config.headers = config.headers || {};
            config.headers['X-Requested-With'] = 'Angular';
            return config;
        },
        'responseError': function (response) {
            if (response.status === 401 || response.status === 403) {
                var authService = $injector.get('authService');
                authService.showLogin();
            }
            return $q.reject(response);
        }

    };
});

// Here we build a singleton factory that we call api, we use this to check login and authorize.
app.factory('api', function ($resource, $httpParamSerializer) {
    var api = {};

    // This is the post method we use to get a token, it has been url encoded, ie: ?var=var1&etc=etc1 and so on.
    api.token = $resource(document.location.origin + "/rest/token", {} , {
        post: {
            method: "POST",
            headers: {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},
            transformRequest: function (data) {
                return $httpParamSerializer(data);
            }
        }
    });

    api.changeOrganisation = $resource(document.location.origin + "/rest/token/organisation/:organisationId", { organisationId : '@id' }, { 'update': { method:'PUT' }});


    // This is the reauthorize/authorize call. Using url encoding and Angulars httpParamSerializer to make sure
    // we use a url encoding.
    api.authorize = $resource(document.location.origin + "/rest/authorize", {}, {
        post: {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            transformRequest: function (data) {
                return $httpParamSerializer(data);
            },
            transformResponse: function(data, headers){
                response = {}
                response.data = data;
                response.headers = headers();
                return response;
            }
        }
    });

    api.myAccount = $resource(document.location.origin + "/rest/myaccount");

    api.organisations = $resource(document.location.origin + "/rest/organisations");

    api.contactDetails = $resource("", {}, {
         get: {
             method: 'GET',
             url: document.location.origin + "/rest/contact/",
             headers: {
                 "Content-Type" : "application/json",
              },
         }
     });

    return api;
});

// Another singleton to actually check login
app.factory('authService', function (api, $rootScope, $timeout) {

    var service = {
        login: login,
        changeOrganisation: changeOrganisation,
        showLogin: showLogin

    };

    function login(params){
        return api.token.post(params).$promise.then(function (res) {
            if(res["access_token"] != undefined){

                // If the call was successfull, we have to broadcast to the modules listening to perform
                // an action.
                $rootScope.$broadcast('auth', res);
            }
            return res;
        });

    }

    function changeOrganisation(organisation) {
        console.log('Changing to organisation ' + organisation.id + ' / ' + organisation.name);

        api.changeOrganisation.update({ organisationId: organisation.id }, null).$promise.then(function (res) {
            if(res["access_token"] != undefined){

                // If the call was successfull, we have to broadcast to the modules listening to perform
                // an action.
                $rootScope.$broadcast('auth', res);
            }
        });


    }

    function showLogin() {

        var location = document.location.toString();
        if(location.indexOf("searchscope") != -1 || location.indexOf("documentation") != -1){
            return;
        }

        $timeout(function() {
            $('#login-detail').modal();
            $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png">');
            $("#login-detail-body").html( '<form id="form-post" method="post" autocomplete="on">' +
                                               'Kundennummer<b></b>:<br>' +
                                               '<input class="modal-input" type="number" id="customer" name="customer" placeholder="Kundennummer" autofocus>' +
                                               '<br>Email<b></b>:<br>' +
                                               '<input class="modal-input" type="text" id="email" name="email">' +
                                               '<br>Passwort<b></b>:<br>' +
                                               '<input class="modal-input" type="password" id="pw" name="pw"><br><br>' +
                                               '<button id="login-service-button" class="pull-right login-btn"> Login </button><br>'+
                                               '</form>');

           if(localStorage.getItem("com.scopevisio.credentials.customer") != undefined){
               $("#customer").val(localStorage.getItem("com.scopevisio.credentials.customer"));
           }

           $("#form-post").submit(function(e){
               e.preventDefault();

               var params = {};
               params.grant_type = "password";
               params.password = document.getElementById("pw").value;
               params.customer = document.getElementById("customer").value;
               params.username = document.getElementById("email").value;
               params.requestcookie = "true";

               login(params)
               .then(function (res) {
                   $('#login-detail').modal('toggle');
               });
           });

       }, 0);
   }

    // Following the Yahoo Module Pattern in our returns in order to
    // return an object.
    return service;
});

/*
*
*   INDEX
*   Our Index controller, this controller checks for our login, our organisation and
*   account changes.
*
*/
app.controller('indexController', function(api, authService, $scope, $resource, $httpParamSerializer) {

    var vm = this;
    // Data
    vm.account = null;
    vm.organisations = [];

    // Methods
    vm.onChangeOrganisation = onChangeOrganisation;
    vm.onLogout = onLogout;
    vm.onExplanationClick = onExplanationClick;

    $scope.$on('auth', function(auth) {
        init();
    });

    init();


    function init() {

        api.myAccount.get().$promise
            .then(function (data) {
                vm.account = data;
                return api.organisations.get().$promise;
            })
            .then(function (data) {
                vm.organisations = data.records;
            })
            .catch (function (resp) {
                console.error(resp);
            });
    }

    function onChangeOrganisation(organisation) {
        authService.changeOrganisation(organisation);
    }


    function onExplanationClick(method){
        if(method == "login"){
            $('#login-detail').modal();
            $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> Token </h3>');
            $("#login-detail-body").html('<div class="explain-call">' +
                                         '<div class="explain-title">  </div>' +
                                         '<div class="explain-content"> Retrieves a Scopevisio access token.. <br> ' +
                                         '<br> Method<pre><code>POST</code></pre> </div>' +
                                         '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/token" + '</code></pre></div> ' +
                                         '<div class="explain-call-args"> Parameters<pre><code> { "grant_type" : string, "customer" : id, "username": string ... etc }</code></pre> </div>' +
                                         '<div class="explain-example"> cURL Example<pre><code>curl -s -d "customer=[customerid]" -d "username=[username]" -d "password=[password]" -d "grant_type=password" '+ document.location.origin +'/rest/token </code></pre> </div>' +
                                         '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Authorization/token" target="_blank"> Find out more here. </a> </div>' +
             '</div>');
        } else if(method == "org"){
        $('#login-detail').modal();
        $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> Organisations </h3>');
        $("#login-detail-body").html('<div class="explain-call">' +
                                     '<div class="explain-title">  </div>' +
                                     '<div class="explain-content"> Returns organisations of a customers instance. <br> ' +
                                     '<br> Method<pre><code>GET</code></pre> </div>' +
                                     '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/organisations" + '</code></pre></div> ' +
                                     '<div class="explain-call-args"> Parameters<pre><code>No Parameters required.</code></pre> </div>' +
                                     '<div class="explain-example"> cURL Example<pre><code>curl -s -H "Authorization: Bearer [YOUR TOKEN]"'+ document.location.origin + '/rest/organisations </code></pre> </div>' +
                                     '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Additional/organisationJson" target="_blank"> Find out more here. </a> </div>' +
         '</div>');
        }
    }

    function onLogout() {
        api.token.delete().$promise
            .then(function (data) {
                vm.account = null;
                vm.organisations = [];
                authService.showLogin();
            });
    }




});

app.controller('mainService', function(api, $scope, $resource, $httpParamSerializer){
    // This isnt used for anything. Can be used for extra checks or on main.html being loaded.
});

/*
*
* APPS
*
*/

/*
*
*   PROJECTS APP SERVICE
*   Our Project App. Checks if the user is still logged in and checks if our SVAT cookie exists
*   If everything is OK, it loads our Projects from the server.
*
*/

app.controller('projectsService', function ($scope, $resource, NgTableParams, $httpParamSerializer) {
    $scope.$on('auth', function(auth) {
        initialCall();
    });

    $scope.showInfo = function(record){
       document.location = "#!projectsdetails?id="+record.id;
    }

     var initialSettings = {
         // page size buttons (right set of buttons in demo)
         counts: [],
         // determines the pager buttons (left set of buttons in demo)
         paginationMaxBlocks: 13,
         paginationMinBlocks: 2
     };

     initialCall();

     function initialCall(){
         var x = $resource(document.location.origin + "/rest/projects", {}, {
              getMe: {
                  method: 'POST',
                  headers: {
                      "Content-Type" : "application/json",
                  },

              }
          });

          x.getMe(function(res){
             var data = res.records;
             $scope.tableParams = new NgTableParams(initialSettings, { dataset: data, count: 5})
          }, function(fail){
             if(fail.status == 403){
                $("#project-alert").css("display", "block").text(fail.data.message);

             }

          });

         $("#info-box-table-projects").on("click", function(e){
            $('#login-detail').modal();
            $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> Projects </h3>');
            $("#login-detail-body").html('<div class="explain-call">' +
                                         '<div class="explain-title">  </div>' +
                                         '<div class="explain-content"> Returns Scopevisio projects. <br> ' +
                                         '<br> Method<pre><code>POST</code></pre> </div>' +
                                         '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/projects" + '</code></pre></div> ' +
                                         '<div class="explain-call-args">Parameters<pre><code>{ "fields": [ "[fieldname1]", "[fieldname2" ], "order": [ "[fieldname1]", "name=[asc,desc]" ] } </code></pre> </div>' +
                                         '<div class="explain-example"> cURL Example<pre><code>curl -v -d "{"fields": [ "id", "name" ], "order": [ "name", "name=desc" ]}" -H "Content-Type: application/json" -H "Authorization: Bearer [YOUR TOKEN]"'+document.location.origin+'/rest/contact/projects" </code></pre> </div>' +
                                         '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Project/getProjects" target="_blank"> Find out more here. </a> </div>' +
             '</div>');
         });


     }

});

/*
*
*   DETAIL APP PROJECT
*   This is the detail project view model.
*   Loads an individual project that we have clicked on.
*
*
*/

app.controller('projectServiceDetails', function ($scope, $resource, NgTableParams) {

    initialCall();

    function initialCall(){
        var id = getParameterByName("id", document.location.href);
        //$scope.$imgLink = document.location.origin + "/rest/project/" + id + "/thumb";

        var x = $resource(document.location.origin + "/rest/project/"+id, {}, {
            getMe: {
                method: 'GET',
                headers: {
                    "Content-Type" : "application/json",
                 }
            }
        });

        x.getMe(function(res){
            $scope.$contactInfo = res;
            $scope.title = res.name;
        },function(fail){
            console.log(fail);
        })

        $("#info-box-table-project").on("click", function(e){
            $('#login-detail').modal();
            $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> Project (Single) </h3>');
            $("#login-detail-body").html('<div class="explain-call">' +
                                         '<div class="explain-title">  </div>' +
                                         '<div class="explain-content"> Returns the Scopevisio project with the given id. <br> ' +
                                         '<br> Method<pre><code>GET</code></pre> </div>' +
                                         '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/project/[id]" + '</code></pre></div> ' +
                                         '<div class="explain-call-args">Parameters<pre><code>fields(optional) </code></pre> </div>' +
                                         '<div class="explain-example"> cURL Example<pre><code>curl -s -H "Authorization: Bearer [YOUR TOKEN]"  '+document.location.origin+'/rest/project/[id]?fields=[fields]" </code></pre> </div>' +
                                         '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Project/getProject" target="_blank"> Find out more here. </a> </div>' +
             '</div>');
         });


    }

    function getParameterByName(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }


});

/*
*
*   CONTACTS APP SERVICE
*   Our Contact App. Loads contacts into a table, checks if we're still logged in
*
*/
app.controller('contactsService', function ($scope, $resource, NgTableParams, $httpParamSerializer) {
    $scope.$on('auth', function(auth) {
        initialCall();
    });

    $scope.showInfo = function(record){
        document.location = "#!contactsdetails?id="+record.id;
    }

    $scope.showWebServiceInfo = function(){
        showInfoBox("img");
    }

    var initialSettings = {
        // page size buttons
        count: 50,
        counts: [],
        // determines the pager buttons
        paginationMaxBlocks: 13,
        paginationMinBlocks: 2
    };

    initialCall();

    function initialCall(){
        var x = $resource(document.location.origin + "/rest/contacts", {}, {
            postMe: {
                method: 'POST',
                headers: {
                    "Content-Type" : "application/json",
                 },
            }
        });

        x.postMe(function(res){

            var data = res.records;

            $scope.tableParams = new NgTableParams(initialSettings, { dataset: data })

            $scope.loc = window.location.origin;

        }, function(fail){
        });


        var infoBoxTable = document.getElementById("info-box-table-contacts");



        infoBoxTable.addEventListener("click", function(e){
            showInfoBox("table");
        });
    }


    function showInfoBox(e){

        if(e === "table"){
            $('#login-detail').modal();
            $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> Contacts </h3>');
            $("#login-detail-body").html('<div class="explain-call">' +
                                         '<div class="explain-title">  </div>' +
                                         '<div class="explain-content"> Returns Scopevisio contacts. <br> ' +
                                         '<br> Method<pre><code>POST</code></pre> </div>' +
                                         '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/contacts" + '</code></pre></div> ' +
                                         '<div class="explain-call-args"> Parameters<pre><code> { "fields": [ "[fieldname1]", "[fieldname2" ], "order": [ "[fieldname1]", "name=[asc,desc]" ] }</code></pre> </div>' +
                                         '<div class="explain-example"> cURL Example<pre><code>curl -v -d "{"fields": [ "id", "name" ], "order": [ "name", "name=desc" ]}" -H "Content-Type: application/json" -H "Authorization: Bearer [YOUR TOKEN]" '+ document.location.origin + '/rest/contacts </code></pre> </div>' +
                                         '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Contact/getContacts" target="_blank"> Find out more here. </a> </div>' +
             '</div>');
         }else if(e === "img"){
            $('#login-detail').modal();
            $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> Contact Thumb </h3>');
            $("#login-detail-body").html('<div class="explain-call">' +
                                         '<div class="explain-title">  </div>' +
                                         '<div class="explain-content"> Returns the thumb of a Scopevisio contact with the given id. <br> ' +
                                         '<br> Method<pre><code>GET</code></pre> </div>' +
                                         '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/contact/[id]/thumb" + '</code></pre></div> ' +
                                         '<div class="explain-call-args"> Parameters<pre><code> No Parameters given </code></pre> </div>' +
                                         '<div class="explain-example"> cURL Example<pre><code>curl -s -H "Authorization: Bearer [YOUR TOKEN]"  '+document.location.origin+'/rest/contact/[id]/thumb" </code></pre> </div>' +
                                         '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Contact/getImage" target="_blank"> Find out more here. </a> </div>' +
             '</div>');
         }

    }






});

/*
*
* DETAIL APP CONTACT
* This is the detail contact view model.
* Just like the Project Detail View Model, it loads a single resource and displays it in a table.
*
*/

app.controller('contactDetailService', function ($scope, $resource, NgTableParams) {

    initialCall();

    function initialCall(){

        var id = getParameterByName("id", document.location.href);
        $scope.$imgLink = document.location.origin + "/rest/contact/" + id + "/thumb";

        var x = $resource(document.location.origin + "/rest/contact/"+id, {}, {
            getMe: {
                method: 'GET',
                headers: {
                    "Content-Type" : "application/json",

                 },
            }
        });

        x.getMe(function(res){
            $scope.$contactInfo = res;
            $("#active-contact").text((res.firstname == null ? "" : res.firstname) + " " + res.lastname);
            $("#char-title").text((res.firstname == null ? "" : res.firstname) + " " + res.lastname)
        },function(fail){
            console.log(fail);
        })


        $("#info-box-table-contact").on("click", function(e){
            $('#login-detail').modal();
            $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> Contact (Single) </h3>');
            $("#login-detail-body").html('<div class="explain-call">' +
                                         '<div class="explain-title">  </div>' +
                                         '<div class="explain-content"> Returns the Scopevisio contact with the given id. <br> ' +
                                         '<br> Method<pre><code>GET</code></pre> </div>' +
                                         '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/contact/[id]" + '</code></pre></div> ' +
                                         '<div class="explain-call-args">Parameters<pre><code>fields(optional) </code></pre> </div>' +
                                         '<div class="explain-example"> cURL Example<pre><code>curl -s -H "Authorization: Bearer [YOUR TOKEN]"  '+document.location.origin+'/rest/contact/[id]?fields=[fields]" </code></pre> </div>' +
                                         '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Contact/getContactById" target="_blank"> Find out more here. </a> </div>' +
             '</div>');
        });


    }

    function getParameterByName(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }



});


/*
*
* TASK APP SERVICE
* Our Task/Aufgaben app. Lots of delicious things to do in here
*
*/
app.controller('taskService', function ($scope, $resource, NgTableParams) {
    $scope.$on('auth', function(auth) {
        initialCall();
    });

    $scope.showInfo = function(record){
       document.location = "#!tasksdetails?id="+record.id;
    }

    $scope.selectedKontaktId = "";

    // An attempt to manipulate the first and lastname to allow for searching of such stuff
    $scope.localSearch = function(str) {
      var matches = [];

      $scope.contacts.forEach(function(c) {
        var first = c.firstname != null ? c.firstname : "";
        var last = c.lastname != null ? c.lastname : "";
        var fullName =   first + ' ' + last ;
        if (fullName.toLowerCase().indexOf(str.toString().toLowerCase()) >= 0) {
          matches.push(c);
        }
      });
      return matches;
    };

     var initialSettings = {
         // page size buttons (right set of buttons in demo)
         counts: [],
         // determines the pager buttons (left set of buttons in demo)
         paginationMaxBlocks: 13,
         paginationMinBlocks: 2
     };

     initialCall();

     function initialCall(){
         var x = $resource(document.location.origin + "/rest/tasks", {}, {
              postMe: {
                  method: 'POST',
                  headers: {
                      "Content-Type" : "application/json",
                  },
              }
          });

          x.postMe(function(res){
             var data = res.records;
             // Simple date conversion to make it readble

             for(var i = 0; i < res.records.length; i++){

                if(res.records[i].startDateTs != undefined){
                    var startDate = new Date(res.records[i].startDateTs);
                }

                if(res.records[i].dueDateTs != undefined){
                    var dueDate = new Date(res.records[i].dueDateTs);
                }

                if(startDate != undefined)
                    data[i].startDateTs = startDate.toString();
                if(dueDate != undefined)
                    data[i].dueDateTs = dueDate.toString();

             }



             $scope.tableParams = new NgTableParams(initialSettings, { dataset: data, count: 5});
          }, function(fail){

          });

          // Getting contacts for filtering
          var contacts = $resource(document.location.origin + "/rest/contacts", {}, {
            postMe: {
                method: 'POST',
                headers: {
                    "Content-Type" : "application/json",
                },
            }
          });

          contacts.postMe(function(res){
            $scope.contacts = res.records;
          }, function(fail){

          });

     }

     $("#info-box-table-tasks").on("click", (e) => {
         $('#login-detail').modal();
         $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> Tasks </h3>');
         $("#login-detail-body").html('<div class="explain-call">' +
                                      '<div class="explain-title">  </div>' +
                                      '<div class="explain-content"> Returns Scopevisio contacts. <br> ' +
                                      '<br> Method<pre><code>POST</code></pre> </div>' +
                                      '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/tasks" + '</code></pre></div> ' +
                                      '<div class="explain-call-args"> Parameters<pre><code>{ "fields": [ "[fieldname1]", "[fieldname2]" ], "order": [ "[fieldname1]", "name=[asc,desc]" ] }</code></pre> </div>' +
                                      '<div class="explain-example"> cURL Example<pre><code>curl -v -d "{"fields": [ "id", "name" ], "order": ["name", "name=desc" ]}" -H "Content-Type: application/json" -H "Authorization: Bearer [YOUR TOKEN]" '+ document.location.origin + '/rest/tasks </code></pre> </div>' +
                                      '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Task/updateTask" target="_blank"> Find out more here. </a> </div>' +
          '</div>');
      });

     $("#info-box-new-tasks").on("click", (e) => {
     $('#login-detail').modal();
          $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> New Task </h3>');
          $("#login-detail-body").html('<div class="explain-call">' +
                                       '<div class="explain-title">  </div>' +
                                       '<div class="explain-content"> Create a new Scopevisio Task / Aufgabe <br> ' +
                                       '<br> Method<pre><code>POST</code></pre> </div>' +
                                       '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/task/new" + '</code></pre></div> ' +
                                       '<div class="explain-call-args"> Parameters<pre><code>{"[fieldname1]" : [fieldvalue], "[fieldname2]": [fieldvalue2] } </code></pre> </div>' +
                                       '<div class="explain-example"> cURL Example<pre><code>curl -v -d \'{"contactId": "10015", "responsibleContactId": 10016, "topic" : "Telefonat durchführen" }\' -H "Content-Type: application/json" -H "Authorization: Bearer [TOKEN]" [ADDR]/rest/task/new" '+ document.location.origin + '/rest/tasks </code></pre> </div>' +
                                       '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Task/createTask" target="_blank"> Find out more here. </a> </div>' +
          '</div>');
     });

     $("#new-task").on("click", (e)=> {
        $('#new-task-detail').modal();
     });

     // This is the form.
     $("#new-task-form").on("submit", (e)=>{
        var data = {};

        // This is the topic, it does not contain any client side validation.
        data.topic = $("#topicInput").val();

        // Priority
        if($("#priorityInput").val() != undefined){
            data.priority = $("#priorityInput").val();
        }

        //description
        if($("#descriptionInput").val() != undefined){
            data.description = $("#descriptionInput").val();
        }

        // start date as ts
        if(new Date($("#startDatePicker").val()).getTime() != NaN){
            data.startDateTS = new Date($("#startDatePicker").val()).getTime();
        }
        // end date as ts
        if(new Date($("#endDatePicker").val()).getTime() != NaN){
            data.dueDateTS = new Date($("#endDatePicker").val()).getTime();
        }

        if($scope.selectedKontaktId.originalObject.id != undefined)
            data.contactId = $scope.selectedKontaktId.originalObject.id;
        if($("#contactSphere").val() != undefined)
            data.contactSphere = $("#contactSphere").val();

        var x = $resource(document.location.origin + "/rest/task/new", {}, {
            postMe: {
                method: 'POST',
                data: data,
                headers: {
                    "Content-Type" : "application/json",
                 },
            }
        });

        x.postMe(data, (e) => {
           $('#new-task-detail').modal('hide');
           initialCall();
        }, (f) => {
            console.log(f);
        });


     });



});


/*
*
* DETAIL TASK SERVICE
* Our details/closer look of a task
*
*/
app.controller('taskServiceDetails', function ($scope, $resource, NgTableParams) {

    var id = getParameterByName("id", document.location.href);

    initialCall();

    function initialCall(){

        var x = $resource(document.location.origin + "/rest/task/"+id, {}, {
            getMe: {
                method: 'GET',
                headers: {
                    "Content-Type" : "application/json",

                 },
            }
        });

        x.getMe(function(res){
            $scope.$contactInfo = res;
            $("#active-task").text((res.topic == null ? "Aufgabe" : res.topic));
            $("#char-title").text((res.topic == null ? "" : res.topic));
        },function(fail){
            console.log(fail);
        })


    }

    function getParameterByName(name, url) {
        if (!url) {
            url = window.location.href;
        }
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    $("#info-box-table-task").on("click", function(e){
        $('#login-detail').modal();
        $("#login-detail-header").html('<img src="/static/browser/assets/scopevisio-logo-scroll.png"> <h3> Task (Single) </h3>');
        $("#login-detail-body").html('<div class="explain-call">' +
                                     '<div class="explain-title">  </div>' +
                                     '<div class="explain-content"> Returns the Scopevisio task with the given id. <br> ' +
                                     '<br> Method<pre><code>GET</code></pre> </div>' +
                                     '<div class="explain-call-details">URL<pre><code>'+ document.location.origin + "/rest/task/[id]" + '</code></pre></div> ' +
                                     '<div class="explain-call-args">Parameters<pre><code>fields(optional) </code></pre> </div>' +
                                     '<div class="explain-example"> cURL Example<pre><code>curl -s -H "Authorization: Bearer [YOUR TOKEN]"  '+document.location.origin+'/rest/task/[id]?fields=[fields]" </code></pre> </div>' +
                                     '<div class="explain-url"><a href="'+document.location.origin+'/static/swagger/index.html#/Task/getTask" target="_blank"> Find out more here. </a> </div>' +
         '</div>');
     });


});


app.controller('teamworkService', function($scope, $resource, NgTableParams){

    var x = $resource(document.location.origin + "/rest/teamworktoken", {}, {
        getMe: {
            method: 'GET',
            headers: {
                "Content-Type" : "application/json",

             },
        }
    });

    x.getMe(function(res){
        console.log(res);
    }, function(f){
        console.log(f);
    });


});

app.controller('searchService', function(api, $scope, $resource, $httpParamSerializer){

});


app.controller('documentationService', function(api, $scope, $resource, $httpParamSerializer){

});