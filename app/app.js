'use strict';

/**
 * @ngdoc overview
 * @name frenFlixOnsenApp
 * @description
 * # frenFlixOnsenApp
 *
 * Main module of the application.
 */
 var app = angular.module('frenFlixOnsenApp', [
  'onsen', 
  'ui.router',
  'ngAnimate',
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngTouch'
  ]);

  // app.config(function ($routeProvider) {
  //   $routeProvider
  //     .when('/', {
  //       templateUrl: 'views/main.html',
  //       controller: 'MainCtrl',
  //       controllerAs: 'main'
  //     })
  //     .when('/about', {
  //       templateUrl: 'views/about.html',
  //       controller: 'AboutCtrl',
  //       controllerAs: 'about'
  //     })
  //     .otherwise({
  //       redirectTo: '/'
  //     });
  // });

app.config(function($stateProvider, $httpProvider, $urlRouterProvider) {
  //
  // For any unmatched url, redirect to /home
  $urlRouterProvider.otherwise("/home");

  $httpProvider.interceptors.push('authInterceptor');
  //
  // Now set up the states
  $stateProvider
   // Tab - Home - Navigator Init
  // .state('navigator', {
  //   abstract: true,
  //   //url: '/dd', // Optional url prefix
  //   resolve: {
  //     loaded: function($rootScope) {
  //       // console.log("Loading parent state");
  //       return $rootScope.myTabbar.loadPage('mainTemplate');
  //     }
  //   }
  // })

  // // Tab Display Profile
  // .state('navigator.login', {
  //   parent: 'navigator',
  //   url: '/login',
  //   onEnter: ['$rootScope', function($rootScope) {
  //       $rootScope.myNavigator.resetToPage('login/login.html');
  //   }]
  // })
  .state('home', {
    url: "/home",
    templateUrl: "pages/views/main.html"
  })
    // .state('main', {
    //   url: "/main",
    //   templateUrl: "views/main.html",
    //   controller: function($scope) {
    //     $scope.items = ["A", "List", "Of", "Items"];
    //   }
    // })
  .state('about', {
    url: "/about",
    templateUrl: "pages/views/about.html"
  });
      // .state('about.list', {
      //   url: "/list",
      //   templateUrl: "views/about.html",
      //   controller: function($scope) {
      //     $scope.things = ["A", "Set", "Of", "Things"];
      //   }
      // });
 }).factory('authInterceptor', function ($rootScope, $q, $cookieStore, $location)
  {
    return {
        // Add authorization token to headers
        request: function (config) {
          config.headers = config.headers || {};
          if ($cookieStore.get('token')) {
            config.headers.Authorization = 'Bearer ' + $cookieStore.get('token');
          }
          return config;
        },

        // Intercept 401s and redirect you to login
        responseError: function(response)
        {
          if(response.status === 401)
          {
            $location.path('/login');
          // remove any stale tokens
          $cookieStore.remove('token');
          return $q.reject(response);
          }
          else
          {
            return $q.reject(response);
          }
        }
    };
  })

  .run(function ($rootScope, $state, Auth) {
      // Redirect to login if route requires auth and you're not logged in
      $rootScope.$on('$stateChangeStart', function (event, next)
      {
        Auth.isLoggedInAsync(function(loggedIn)
        {
          if (next.authenticate && loggedIn  )
          {
            event.preventDefault();
            $state.go('navigator.login');
          }
        });
      });
    })

  .run(function ($rootScope, $state, Auth, $q) {
    // Redirect to homepage if route requires Admin role and you are not Admin
    $rootScope.$on('$stateChangeStart', function (event, next) {


     if (next.hasToBeSalesOrAdmin) {
      if (Auth.getCurrentUser().$promise===undefined) {

        event.preventDefault();
        $state.go('navigator.login');
      }
      else {

        Auth.getCurrentUser().$promise.then(function() {


          if (!Auth.isSales() && !Auth.isAdmin()){
            event.preventDefault();
            $state.go('navigator.login');
          }
        });
      }
    }
  });   
});

app.factory('User', function ($resource)
{
  return $resource('/api/users/:id/:controller',
  {
    id: '@_id'
  },
  {
    changePassword:
    {
      method: 'PUT',
      params:
      {
        controller:'password'
      }
    },
    updateInfo:
    {
      method: 'PUT',
      params:
      {
        controller:'updateInfo'
      }
    },
    get:
    {
      method: 'GET',
      params:
      {
        id:'me'
      }
    }
  });
});

app.factory('Auth', function Auth($location, $rootScope, $http, User, $cookieStore, $q) {
  var currentUser = {};
  if($cookieStore.get('token')) {
    currentUser = User.get();
  }

  return {

      /**
       * Authenticate user and save token
       *
       * @param  {Object}   user     - login info
       * @param  {Function} callback - optional
       * @return {Promise}
       */
       login: function(user, callback) {

        var cb = callback || angular.noop;
        var deferred = $q.defer();

      // $http.post('/auth/local',
      // {
      //   email: user.email,
      //   password: user.password
      // }).
      // success(function(data)
      // {
      //   //console.log(data.token);
      //   $cookieStore.put('token', data.token);
      //   currentUser = User.get();
      //   deferred.resolve(data);
      //   console.log("succeeded");
      //   return cb();
      // }).
      // error(function(err)
      // {
      //   console.log("failed");
      //   this.logout();
      //   deferred.reject(err);
      //   return cb(err);
      // }.bind(this));

return deferred.promise;
},

    /**
    * Delete access token and user info
    *
    * @param  {Function}
    */
    logout: function()
    {
      $cookieStore.remove('token');
      currentUser = {};
    },

    /**
    * Create a new user
    *
    * @param  {Object}   user     - user info
    * @param  {Function} callback - optional
    * @return {Promise}
    */
    createUser: function(user, callback)
    {
      var cb = callback || angular.noop;

      return User.save(user, function(data)
      {
        $cookieStore.put('token', data.token);

        currentUser = User.get();
        return cb(user);
      }, function(err)
      {
        this.logout();
        return cb(err);
      }.bind(this)).$promise;
    },

    /**
    * Change password
    *
    * @param  {String}   oldPassword
    * @param  {String}   newPassword
    * @param  {Function} callback    - optional
    * @return {Promise}
    */
    changePassword: function(oldPassword, newPassword, callback)
    {
      var cb = callback || angular.noop;

      return User.changePassword({ id: currentUser._id },
      {
        oldPassword: oldPassword,
        newPassword: newPassword
      }, function(user)
      {
        return cb(user);
      }, function(err)
      {
        return cb(err);
      }).$promise;
    },

    /**
    * Gets all available info on authenticated user
    *
    * @return {Object} user
    */
    getCurrentUser: function()
    {
      return currentUser;
    },

    /**
    * Gets unique id on authenticated user
    *
    * @return {ObjectId}
    */
    getCurrentUserId: function()
    {
      return currentUser._id;
    },
    /**
     * Check if a user is logged in
     *
     * @return {Boolean}
     */
     isLoggedIn: function()
     {
      return currentUser.hasOwnProperty('role');
    },

    /**
     * Waits for currentUser to resolve before checking if user is logged in
     */
     isLoggedInAsync: function(cb)
     {
      if(currentUser.hasOwnProperty('$promise'))
      {
        currentUser.$promise.then(function()
        {
          cb(true);
        }).
        catch(function()
        {
          cb(false);
        });
      }
      else if(currentUser.hasOwnProperty('role'))
      {
        cb(true);
      }
      else
      {
        cb(false);
      }
    },

    /**
    * Check if a user is an admin
    *
    * @return {Boolean}
    */
    isAdmin: function()
    {
      return currentUser.role === 'admin';
    },

    // isSales: function()
    // {
    //   return currentUser.role === 'sales';
    // },

    // /**
    // * Check if a user is a candidateTEST
    // * @return {Boolean}
    // */
    // isCandidateTest: function()
    // {
    //   return currentUser.role === 'candidateTEST';
    // },

    // /**
    // * Check if a user is a candidateINTERVIEW
    // * @return {Boolean}
    // */
    // isCandidateInterview: function()
    // {
    //   return currentUser.role === 'candidateINTERVIEW';
    // },

    /**
    * Get auth token
    */
    getToken: function()
    {
      return $cookieStore.get('token');
    }
  };
});
