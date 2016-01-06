var async = require('async')
var passport = require('passport')
// var deasync = require('deasync')
    // , GitHubStrategy = require('passport-github').Strategy
    // , FacebookStrategy = require('passport-facebook').Strategy
    , GoogleStrategy = require('passport-google-oauth').OAuth2Strategy
    // , TwitterStrategy = require('passport-twitter').Strategy;



function addingRoles(accountId){
  currentRole = 0

  var ret;
  roles = []
  // Id = accountId
  setTimeout(function(){
      // console.log(Id)
      UserRole.find({accountId:accountId})
      .exec(function(err,data){
        if (data) {
          // console.log(data)
          // console.log('dataaaaaaa')
          data.forEach(function(d){
            // console.log(d)
            roles.push(d.roleId)
          })
          if (roles.length > 1 || roles[0] == '1')
            currentRole = '1'
          else
            currentRole = '2'

        }

        ret = "hello";

      })
  },3000);
  while(ret === undefined) {
    require('deasync').sleep(100);
  }
  // returns hello with sleep; undefined without
  return {
    roles: roles,
    currentRole: currentRole
  }
}




var verifyHandler = function(token, tokenSecret, profile, done) {
  process.nextTick(function() {
    console.log("Do some verification");
    // console.log('google',profile)
    x = profile.photos[0].value
    var profilePics = x.replace(/50/g, "100");
    Account.findOne({uid: profile.id}, function(err, user) {

      if (user) {

        console.log('express js')

        a = addingRoles(user.id)
        user.currentRole = a.currentRole
        user.roles = a.roles

        return done(null, user);
      } else {

        var data = {
          // provider: profile.provider,
          uid: profile.id,
          photo: profilePics,
          // roles:[1,2],
          // currentRole: 2
        };
        var err = "";

        if (profile.emails && profile.emails[0] && profile.emails[0].value) {
          data.email = profile.emails[0].value;
        }
        if (profile.name && profile.name.givenName) {
          data.firstname = profile.name.givenName;
        }
        if (profile.name && profile.name.familyName) {
          data.lastname = profile.name.familyName;
        }

        if (data.email.indexOf("@meditab.com") < 1 ){
          err = "Email is @meditab.com";
        }

        if(err){
          return done(err, null);
        }
        else{
          console.log('registering new employee')
          async.parallel([
            function(callback) {
              Account.create(data, function(err,account) {
                if (account) {
                  console.log('account')
                  callback(null,account)
                }
              })
            },
            function(callback) {
              UserRole.find({roleId:'1'})
              .exec(function(err,res) {
                // console.log('userrole finding',res.length)
                if (res)
                  console.log('finding 1')
                callback(null,res)

                // else
                //   callback(null,null)
              })
            }
          ], function(err,results) {
            // console.log(results)
            accountId = results[0].id

            async.parallel([
              function(callback) {
                callback(null,results[0])
              },
              function(callback) {
                data = {
                  accountId: accountId,
                  teamId: ''
                }
                Teammember.create(data, function(err,member) {
                  if (member) {
                    console.log('teammembers')
                    callback(null, member)
                  }
                })
              },
              function(callback) {
                data = {
                  accountId: accountId
                }
                if (results[1].length)
                  data.roleId = '2'
                else
                  data.roleId = '1'
                UserRole.create(data, function(err,userrole) {
                  if (userrole){
                    console.log('userrole')
                    callback(null,userrole)
                  }
                })
              },
              function(callback) {
                notifs = []
                if (results[1].length) {
                  results[1].forEach(function(res) {
                    data = {
                      // type: 'New Employee',
                      sender: accountId,
                      receiver: res.accountId
                    }
                    Notification.create(data,function(err,notif) {
                      if (notif)
                        console.log('notification')
                        callback(null)
                    })
                  })
                }
                else
                  callback(null)
              } /// notifs
            ], function(err,results) {

              if (results) {
                user = results[0]
                user.roles = []
                roleId = results[2].roleId
                user.roles.push(roleId)
                user.currentRole = roleId
                return done(null,user)
              }
            })
            }
          )
        } // else
      } // else
    }) //find
  })
};

//called from AuthController login
passport.serializeUser(function(user, done) {
  // console.log('serializing', user)
  // console.log("serialiezing");
  // console.log(user) // check user data
  done(null, user);// i don't know where this goes
});

passport.deserializeUser(function(user, done) {
  Account.findOne({uid: user.uid}, function(err, user) {
    done(err, user); // and also this one GG
  });
});

/**
 * Configure advanced options for the Express server inside of Sails.
 *
 * For more information on configuration, check out:
 * http://sailsjs.org/#documentation
 */
module.exports.http = {

  customMiddleware: function(app) {

    // callbackURL = app.settings.env === "production" ? 'http://template.app.com/auth/google/callback':'http://localhost:9000/auth/google/callback';

    callbackURL = 'http://localhost:1337/auth/google/callback';
    passport.use(new GoogleStrategy({
      clientID: '106775020959-6v44v5h4jf8tja5q7s4r841vgkk5u1t6.apps.googleusercontent.com',
      clientSecret: 'CFiGE3gBhCvRQOI6Ck03yoRT',
      callbackURL: callbackURL
    }, verifyHandler));

    // passport.use(new GitHubStrategy({
    //   clientID: "YOUR_CLIENT_ID",
    //   clientSecret: "YOUR_CLIENT_SECRET",
    //   callbackURL: "http://localhost:1337/auth/github/callback"
    // }, verifyHandler));

    // passport.use(new FacebookStrategy({
    //   clientID: "YOUR_CLIENT_ID",
    //   clientSecret: "YOUR_CLIENT_SECRET",
    //   callbackURL: "http://localhost:1337/auth/facebook/callback"
    // }, verifyHandler));

    // passport.use(new TwitterStrategy({
    //   consumerKey: 'YOUR_CLIENT_ID',
    //   consumerSecret: 'YOUR_CLIENT_SECRET',
    //   callbackURL: 'http://localhost:1337/auth/twitter/callback'
    // }, verifyHandler));

    app.use(passport.initialize());
    app.use(passport.session());
  }

  // Completely override Express middleware loading.
  // If you only want to override the bodyParser, cookieParser
  // or methodOverride middleware, see the appropriate keys below.
  // If you only want to override one or more of the default middleware,
  // but keep the order the same, use the `middleware` key.
  // See the `http` hook in the Sails core for the default loading order.
  //
  // loadMiddleware: function( app, defaultMiddleware, sails ) { ... }


  // Override one or more of the default middleware (besides bodyParser, cookieParser)
  //
  // middleware: {
  //    session: false, // turn off session completely for HTTP requests
  //    404: function ( req, res, next ) { ... your custom 404 middleware ... }
  // }


  // The middleware function used for parsing the HTTP request body.
  // (this most commonly comes up in the context of file uploads)
  //
  // Defaults to a slightly modified version of `express.bodyParser`, i.e.:
  // If the Connect `bodyParser` doesn't understand the HTTP body request
  // data, Sails runs it again with an artificial header, forcing it to try
  // and parse the request body as JSON.  (this allows JSON to be used as your
  // request data without the need to specify a 'Content-type: application/json'
  // header)
  //
  // If you want to change any of that, you can override the bodyParser with
  // your own custom middleware:
  // bodyParser: function customBodyParser (options) { ... return function(req, res, next) {...}; }
  //
  // Or you can always revert back to the vanilla parser built-in to Connect/Express:
  // bodyParser: require('express').bodyParser,
  //
  // Or to disable the body parser completely:
  // bodyParser: false,
  // (useful for streaming file uploads-- to disk or S3 or wherever you like)
  //
  // WARNING
  // ======================================================================
  // Multipart bodyParser (i.e. express.multipart() ) will be removed
  // in Connect 3 / Express 4.
  // [Why?](https://github.com/senchalabs/connect/wiki/Connect-3.0)
  //
  // The multipart component of this parser will be replaced
  // in a subsequent version of Sails (after v0.10, probably v0.11) with:
  // [file-parser](https://github.com/balderdashy/file-parser)
  // (or something comparable)
  //
  // If you understand the risks of using the multipart bodyParser,
  // and would like to disable the warning log messages, uncomment:
  // silenceMultipartWarning: true,
  // ======================================================================


  // Cookie parser middleware to use
  //			(or false to disable)
  //
  // Defaults to `express.cookieParser`
  //
  // Example override:
  // cookieParser: (function customMethodOverride (req, res, next) {})(),


  // HTTP method override middleware
  //			(or false to disable)
  //
  // This option allows artificial query params to be passed to trick
  // Sails into thinking a different HTTP verb was used.
  // Useful when supporting an API for user-agents which don't allow
  // PUT or DELETE requests
  //
  // Defaults to `express.methodOverride`
  //
  // Example override:
  // methodOverride: (function customMethodOverride (req, res, next) {})()
};


/**
 * HTTP Flat-File Cache
 *
 * These settings are for Express' static middleware- the part that serves
 * flat-files like images, css, client-side templates, favicons, etc.
 *
 * In Sails, this affects the files in your app's `assets` directory.
 * By default, Sails uses your project's Gruntfile to compile/copy those
 * assets to `.tmp/public`, where they're accessible to Express.
 *
 * The HTTP static cache is only active in a 'production' environment,
 * since that's the only time Express will cache flat-files.
 *
 * For more information on configuration, check out:
 * http://sailsjs.org/#documentation
 */
module.exports.cache = {

  // The number of seconds to cache files being served from disk
  // (only works in production mode)
  maxAge: 31557600000
};
