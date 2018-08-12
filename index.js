const express = require('express');
const app = express();
const ynab = require('ynab');

var request = require('request');
var path = require('path');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var awis = require('awis'); // Alexa web information services


// TODO: move below into process env

// TESTING VARIABLES TODO:REMOVE

var loggedin = true;
var accessToken = "726800adcbe96f7435c822451e2025f34b533180ce97d3447bb99bf6c3e99a66";
var refreshAccessToken = "ad052ecd71ee56a40628b8d3fe50b69264614aea35d7ff377ee0f3c6d17c16d7"

///END TESTING VARIABLES

var refreshToken = function(callback) {
  console.log(refreshToken);
  var token = refreshAccessToken
  var url = "https://app.youneedabudget.com/oauth/token?client_id=61640ecd06db3c2a208c94cf732a4ca2c3a9ce0b2260c5556197019f95aa5f75&client_secret=32d8b4dceb0e0046917ff370f95fc4ebfe9082ffcff6ec41c3b0796e4cf37ff7&grant_type=refresh_token&refresh_token="+refreshAccessToken;
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
        // TODO: update the database with the refreshed access token
        callback(r);
      }
  });
};

app.set('views', __dirname + "/views");
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  res.send("hello");
});

app.get('/ynab', function(req, res) {

  // TODO: add a db call here to see if the user exists in the db
  if (!loggedin) {
    res.render('authorize');
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

app.get('/ynab_budgets/', function(req, res) {
  // Get the budgets of a specific person. TODO: This will have to work for any user, not just static Access Key

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
        res.send(200, {token : accessToken, budgets : r["data"]["budgets"]});
      }
    }
  });
});

app.get('/ynab_home', function(req, res) {
  res.render('authorize');
});

app.get('/ynab_category', function(req,res) {
    awsClient({
      'Action' : "UrlInfo",
      'Url' : "koala.com",
      'Path' : '',
      'ResponseGroup' : 'Categories'
    }, function(err, data){
      if (err) {
        console.log("Error: " + err);
        res.send(400);
      } else {
        console.log(data);
        res.send(data);
      }
    });
});

app.get('/ynab_redirect', function(req, res) {
  var url = "https://app.youneedabudget.com/oauth/token?client_id=61640ecd06db3c2a208c94cf732a4ca2c3a9ce0b2260c5556197019f95aa5f75&client_secret=32d8b4dceb0e0046917ff370f95fc4ebfe9082ffcff6ec41c3b0796e4cf37ff7&redirect_uri=https://35f2c5a3.ngrok.io/ynab_redirect&grant_type=authorization_code&code=" + req.query.code
  request({
    url : url,
    method: "POST",
    dataType: "JSON",
  }, function(err, resp) {
      if (err) {
        console.log("Error: ",err);
      } else {
        console.log(resp);
        res.redirect('/ynab')
      }
  });

});

app.post('/ynab_refresh_token', function(req, res) {
  var token = req.body.token;
  // Refresh the token
  https://app.youneedabudget.com/oauth/token?client_id=[CLIENT_ID]&client_secret=[CLIENT_SECRET]&grant_type=refresh_token&refresh_token=[REFRESH_TOKEN].

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

app.listen(3000, () => console.log('Example app listening on port 3000!'));
