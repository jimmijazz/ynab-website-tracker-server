const express = require('express');
const app = express();
const ynab = require('ynab');
const mongodb = require('mongodb');
var request = require('request');
var path = require('path');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var awis = require('awis'); // Alexa web information services
var bodyParser = require('body-parser');

// TODO: move below into process env

// TESTING VARIABLES TODO:REMOVE

var loggedin = false;
var accessToken = "";
var refreshAccessToken = ""

///END TESTING VARIABLES


app.set('views', __dirname + "/views");
app.set('view engine', 'ejs');
app.use(bodyParser()); // get information from html forms

if(app.get('env') === 'development') {
  // Local settings for testing
  require('dotenv').config(); // Require local config file
};

// Configuration ===============================================================
if(app.get('env') === 'development') {
  // Settings for testing
  require('dotenv').config(); // Require local config cile
  port = 3000;
  accessToken = process.env.accessToken;
  refreshAccessToken = process.env.refreshAccessToken

} else {
  // SETTINGS FOR PRODUCTION
  port = process.env.PORT;
};


const mongoURI = process.env.MONGODB_URI;
const USERS = 'users'
var db
// CONNECT TO MONGODB
mongodb.MongoClient.connect(mongoURI, function(err, client) {
  if (err) {
    console.log('Unable to connect to the database. Error: ', err);
    process.exit(1);
  } else {
    // console.log(client);
    db = client.db("heroku_wkgxldrz");
    console.log('Database connection ready');
  }
});

var refreshToken = function(refreshToken, callback) {

  var url = "https://app.youneedabudget.com/oauth/token?client_id=61640ecd06db3c2a208c94cf732a4ca2c3a9ce0b2260c5556197019f95aa5f75&client_secret=32d8b4dceb0e0046917ff370f95fc4ebfe9082ffcff6ec41c3b0796e4cf37ff7&grant_type=refresh_token&refresh_token="+refreshToken;
  request({
    url : url,
    method: "POST",
    dataType : "JSON",
  }, function(err, resp) {
      if (err) {
        console.log("Error: ", err);
      } else {
        var r = JSON.parse(resp.body)
        console.log(r);
        db.collection(USERS).update(
          {refreshToken : refreshToken},
          {
            accessToken : r["access_token"],
            refresh_token : r["refresh_token"]
          }
        );
        callback();
      }
  });
};

// For testing and styling set options page
app.get('/set_options', function(req, res) {
  res.render('set_options')
})

// var checkIfDatabase(accessToken)
// Start views
app.get('/', function(req, res) {
  res.send("hello");
});

app.get('/ynab', function(req, res) {

  // TODO: add a db call here to see if the user exists in the db

  if (!loggedin) {
    res.render('set_options');
  } else {
    // Get user's budgets
    request({
      url : 'https://api.youneedabudget.com/v1/budgets?access_token='+accessToken,
      method : "GET",
    }, function(err, resp) {
      if(err) {
        res.send(500);
      } else {
        var r = JSON.parse(resp.body);
        if(r["error"] && r["error"]["name"] == "unauthorized") {
          // Refresh token
          refreshToken(res.send(200))
        } else {
          res.render('home', {token : accessToken, budgets : r["data"]["budgets"]});
        }
      }
    });
  };
});

app.get("/ynab_token", function(req, res) {
  var userId = (req.query.id);
  // Check if user exists in data
  db.collection(USERS).findOne({_id : userId}, function(err, result) {
    if (err) {
      console.log(err);
      // db.close();
    } else if (result == null) {
      console.log("User does not exist");
      res.status(404).send("user does not exist");
    } else {
      res.status(200).send({"user_id" : result._id, "access_token" : result.accessToken, "refreshToken" : result.refreshToken});  // TODO: send token with the request
    }
  })
  // If not, create it and get a token from YNAB

  //
  // Create token if doesn't exist, else return
});

app.get('/ynab_budgets/', function(req, res) {
  var userId = req.query.id
  db.collection(USERS).findOne({_id : userId}, function(err, result) {
    if (err) {
      console.log(err);
      db.close();
    } else if (result == null) {
      res.status(404).send("user does not exist");
      // res.redirect('/ynab');
    } else {
      request({
        url : 'https://api.youneedabudget.com/v1/budgets?access_token='+result.accessToken,
        method : "GET"
      }, function(err, resp) {
        if(err) {
          console.log("Error getting YNAB data: ", err);
          res.send(500);
        } else {
          var r = JSON.parse(resp.body);
          // Check if token returned ok or has expired
          if(r["error"] && r["error"]["name"] == "unauthorized") {

            // Get new tokens and update in database
            refreshToken(result.refreshToken, function(){
              request({
                  url : 'https://api.youneedabudget.com/v1/budgets?access_token='+result.accessToken,
                  method : "GET",
                }, function(err, resp) {
                  if (err) {
                    console.log("Deeper error getting YNAB data: ", err); // Error getting refresh token
                    res.send(500);
                  } else {
                    // Retry the call
                    request({
                      url : 'https://api.youneedabudget.com/v1/budgets?access_token='+result.accessToken,
                      method : "GET"
                    }, function(err, respo) {
                      if(err) {
                        console.log("Error getting budget after refreshing token: ", err);
                        res.send(500);
                      } else {
                        var r = JSON.parse(respo.body);
                        res.send(200, {token : result.accessToken, budgets : r["data"]["budgets"]});
                      }
                    })
                    var r = JSON.parse(resp.body);
                    console.log(r);
                    res.send(200, {token : result.accessToken, budgets : r["data"]["budgets"]});
                  }
                }
              )
              })
            } else {
              // Send through budget data
              var r = JSON.parse(resp.body);
              res.send(200, {token : result.accessToken, budgets : r["data"]["budgets"]});
          }
        }
      });
    }
  })

});

app.get('/ynab_home', function(req, res) {
  res.render('authorize');
});

// Old code when looking at AWS for web categorization
// app.get('/ynab_category', function(req,res) {
//     awsClient({
//       'Action' : "UrlInfo",
//       'Url' : "koala.com",
//       'Path' : '',
//       'ResponseGroup' : 'Categories'
//     }, function(err, data){
//       if (err) {
//         console.log("Error: " + err);
//         res.send(400);
//       } else {
//         console.log(data);
//         res.send(data);
//       }
//     });
// });

app.get('/ynab_redirect', function(req, res) {
  var url = "https://app.youneedabudget.com/oauth/token?client_id=61640ecd06db3c2a208c94cf732a4ca2c3a9ce0b2260c5556197019f95aa5f75&client_secret=32d8b4dceb0e0046917ff370f95fc4ebfe9082ffcff6ec41c3b0796e4cf37ff7&redirect_uri=https://ynab-website-tracker.herokuapp.com/ynab_redirect&grant_type=authorization_code&code=" + req.query.code
  // Activate the recieved code
  request({
    url : url,
    method: "POST",
    dataType: "JSON",
  }, function(err, resp) {
      if (err) {
        console.log("Error: ",err);
      } else {
        var responseBody = JSON.parse(resp.body);
        var accessToken = responseBody["access_token"];
        var refreshToken = responseBody["refresh_token"];
        // console.log(accessToken, refreshToken);
        // db.collection(USERS).update({
        var userIDURL = "https://api.youneedabudget.com/v1/user?access_token=" + accessToken;

        request({
          url : userIDURL,
          method : "GET"
        }, function(err, resp) {
          if (err) {
            res.send(500);
          } else {
            var userResponseData = JSON.parse(resp.body);
            var userID = userResponseData.data.user.id;
            console.log(userID);
            db.collection(USERS).update(
              { _id : userID},
              {$set : {
                  accessToken : accessToken,
                  refreshToken : refreshToken
                }
              },
              {upsert : true}
            )
          }
          res.redirect('/ynab');
        });

      }
  });
});

app.post('/ynab_refresh_token', function(req, res) {
  var token = req.body.token;

  var url = "https://app.youneedabudget.com/oauth/token?client_id=61640ecd06db3c2a208c94cf732a4ca2c3a9ce0b2260c5556197019f95aa5f75&client_secret=32d8b4dceb0e0046917ff370f95fc4ebfe9082ffcff6ec41c3b0796e4cf37ff7&grant_type=refresh_token&refresh_token="+token;
  request({
    url : url,
    method: "POST",
    dataType : "JSON",
  }, function(err, resp) {
      if (err) {
        console.log("Error: ", err);
      } else {
        console.log(resp);

        // TODO: update the database with the refreshed access token
        res.send(200);
      }
  })

});

// Returns what is left in the users budget category
app.get('/ynab_category_checker/:profile/:category', function(req, res) {
  var profile_email = req.params.profile;
  var category = req.params.category;
  console.log(profile_email);
  console.log(category);
  // console.log('success!');
  res.send(200);
});

app.listen(port, () => console.log('YNAB Web Tracker app listening on port: ' + port + '!'));
