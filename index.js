var aws = require('aws-sdk');
var builderMapsDone = false;
var config = require('./config.json');
var count = 0;
var currentIndex = 0;
var fs = require('fs');
var maps = [];
var request = require('request');
var webshot = require('webshot');
var interval;
var s3;

require('dotenv').config(); // Load in environment variables

aws.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_REGION,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
s3 = new aws.S3();

if (!fs.existsSync('./docs')) {
  fs.mkdirSync('./docs');
}

function takeWebshot (map) {
  var id = map.id;
  var type;
  var url;

  if (map.table_name === 'builder_maps') {
    type = 'Builder';
    url = 'https://www.outerspatial.com/builder_maps/' + id + '/embed';
  } else {
    type = 'Paper';
    url = 'https://www.outerspatial.com/paper_maps/' + id;
  }

  webshot(url, './docs/' + type.toLowerCase() + '-map-' + id + '.png', {
    renderDelay: 5000,
    windowSize: {
      height: 500,
      width: 500
    }
  }, function (error) {
    if (error) {
      console.log('Error taking webshot for ' + type + ' Map: ' + id);
    } else {
      console.log('Successfully created webshot for ' + type + ' Map: ' + id);
    }

    currentIndex++;

    if (currentIndex < count) {
      takeWebshot(maps[currentIndex]);
    } else {
      builderMapsDone = true;
    }
  });
}

request({
  timeout: 30000,
  url: 'https://api.outerspatial.com/v2/builder_maps/?access_token=' + process.env['OUTERSPATIAL_' + config.outerSpatialEnvironment.toUpperCase() + '_ACCESS_TOKEN'] + '&per_page=1000'
}, function (error, response, body) {
  if (response) {
    if (error || response.statusCode !== 200) {
      console.log(response.statusCode);
    } else {
      maps = JSON.parse(body).data;

      if (maps) {
        count = maps.length;
        takeWebshot(maps[currentIndex]);
      }
    }
  } else {
    console.log('No response');
  }
});

interval = setInterval(function () {
  if (builderMapsDone) {
    clearInterval(interval);

    request({
      timeout: 30000,
      url: 'https://api.outerspatial.com/v2/paper_maps/?access_token=' + process.env['OUTERSPATIAL_' + config.outerSpatialEnvironment.toUpperCase() + '_ACCESS_TOKEN'] + '&per_page=1000'
    }, function (error, response, body) {
      if (response) {
        if (error || response.statusCode !== 200) {
          console.log(response.statusCode);
        } else {
          maps = JSON.parse(body).data;

          if (maps) {
            count = maps.length;
            takeWebshot(maps[currentIndex]);
          }
        }
      } else {
        console.log('No response');
      }
    });
  }
}, 1000);
