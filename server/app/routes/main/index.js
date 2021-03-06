'use strict';
var router = require('express').Router();
var Heroes = require('mongoose').model('heroStat');
var PersonalStat = require('mongoose').model('personalStat'); //not used
var Report = require('mongoose').model('Report');
var Log = require('mongoose').model('Log');
var async = require('async');
var cheerio = require('cheerio');
var request = require('request');
var _ = require('lodash');
var memjs = require('memjs');

var client = memjs.Client.create(process.env.MEMCACHEDCLOUD_SERVERS, {
  username: process.env.MEMCACHEDCLOUD_USERNAME,
  password: process.env.MEMCACHEDCLOUD_PASSWORD
});
module.exports = router;
//client.set("allHeroes", "bar");
//client.get("foo", function (err, value, key) {
//  if (value != null) {
//    console.log(value.toString()); // Will print "bar"
//  }
//});

router.get('/', function(req,res,next){
    client.get('AllHeroes', function (err, value, key) {
      if (value != null) {
        console.log('using memcached');
        //console.log(value.toString());
        res.send(JSON.parse(value.toString()));
      } else {
        Heroes.find({}, function(err,heroes){
          console.log('memcached not used!');
          if (err) return next(err);
          var sortedHeroes = heroes.sort(function(a,b){
            console.log(a.order);
            return a.order - b.order;
          });

          client.set('AllHeroes', JSON.stringify(sortedHeroes), function(err, val){
            console.log('stored val: ', val);
          });
          //console.log(sortedHeroes.slice(0, 2).order);
          res.send(sortedHeroes);
        })
      }
    });


});

router.put('/:heroId', function(req,res,next){
    Heroes.findById(req.params.heroId, function(err,hero){
        if (err) return next(err);
        var body = req.body;
        _.extend(hero, body);
        hero.save(function(err, saved){
            res.send(saved);
        })
    })
});
router.post('/serverLog', function(req, res, next){
  console.log('we are inside server log');

  var entireString = req.body.log;
  function getFriendId () {
    var pat = /U:1:(\d*)/g;
    var arrToReturn = [];
    var val;
    while (val = pat.exec(entireString)) {
      arrToReturn.push(val[1]);
    }
    console.log('hoping this runs before serverLog', arrToReturn);
    return arrToReturn;
  };

  var allFriendIDs = getFriendId();

  var lastTenFriendIDs = allFriendIDs.slice(-10);
  //console.log(lastTenFriendIDs);
  Log.create({info: lastTenFriendIDs.toString()}, function(err, savedLog){
    console.log('log created', savedLog._id);
  });

  console.log('here is the hypothetical list of friends ', lastTenFriendIDs );
  var results = [];
  async.forEachLimit(lastTenFriendIDs, 1, function(player, done){
    console.log('inside async now');
    var tempUrl = 'http://www.dotabuff.com/players/' + player + '/heroes?date=year&skill_bracket=&lobby_type=&game_mode=all_pick&faction=&duration=&enjoyment=any&metric=played';
    var options = {
      url: tempUrl,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36' }
    };
    request(options, function (error, response, body) {
      console.log(body);
      var $ = cheerio.load(body);
      var array = [];
      $('tr').each(function(i,elem){
        array.push([$(this).find("img").attr('alt'), $(this).find("td").first().next().next().text(), $(this).find("td").first().next().next().next().text(), $(this).find("td").first().next().next().next().next().text()]);
      });
      array.shift(); //generates all hero stuff
      var playerName = $('.image-container-bigavatar').find('img').attr('alt');
      var playerInfo = [$('.header-content-secondary').find('dd').find('time').text(),$('.header-content-secondary').find('.wins').text(),$('.header-content-secondary').find('.losses').text(),$('.header-content-secondary').find('.abandons').text()];

      var obj = {
        user: playerName,
        userId: player,
        userInfo: playerInfo,
        proficiency: [],
        selectedHero: null
      };
      var tempObj = {};
      array.forEach(function (el) {
        tempObj = {};
        tempObj.name = el[0];
        tempObj.games = el[1];
        tempObj.winRate = (el[2].replace('\.', '').replace('\%', '')) / 10000;
        tempObj.kda = el[3];
        obj.proficiency.push(tempObj);
      });
      //PersonalStat.create(obj, function(err, personalData){
      //  if(err) console.log(err);
      //  console.log('personal data created', personalData);
        results.push(obj);
        done();
      //})
      console.log('here are some results', results);
    });
  }, function(err){
    res.json(results).end();
  })
  //for each player
  //parse player specific data
  //push to database based on friendID
  //create a proficiency hash object
  //pass to front end
}); //this responds with 10 player specific data

router.post('/report', function(req, res, next){
  var logBody = req.body.log;
  console.log('here is req.body.log', logBody);
  Report.create({log: logBody}, function(err, logs){
    if (err) return next(err);
    console.log('report created!');
    console.log(logs);
    res.sendStatus(200);
    res.end();
  })
})






