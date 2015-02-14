# PointsOfInterest

Super simple point of interest mapping app for desktop and mobile.

Comes with simple node.js file flinger, but contents of /public can live on any HTTP server.

## Demo

https://freezing-tribble.herokuapp.com

## Features

* Fast full screen mapping
* Responsive layout
* Fuzzy search
* Host anywhere
* Easy installation

## Config

#### Basic config file

    {
        "config": {
            "showOverlayDelay"  : 400,
            "proximity"         : 10,
            "map": {
              "lat"             : 53.44880683542759,
              "lng"             : -7.734375,
              "zoom"            : 7
            }
        },
        "markers": [
            {
                "title"   : "First place of interest",
                "summary" : "A summary",
                "lat"     : 52.3755991766591,
                "lng"     : -7.789306640625,
                "order"   : 3,
                "icon"    : "media/img/themes/red/flag.png",
                "image"   : "media/img/info.png",
                "detail"  : "<p>Markup for first item</p>"
            }
        ]
    }

#### Customise map styles
Customise the look of your map. The style wizard at http://gmaps-samples-v3.googlecode.com/svn/trunk/styledmaps/wizard/index.html cannot be recommended enough.

    "config": {
        "map": {
          "style" : [
                {
                    "featureType": "all",
                    "stylers" : [
                        {
                            "saturation": -70
                        },
                        {
                            "lightness": 20
                        }
                    ]
                }
            ]
        }
    }

##### Map styling reference
* http://gmaps-samples-v3.googlecode.com/svn/trunk/styledmaps/wizard/index.html
* https://developers.google.com/maps/documentation/javascript/styling

## Installation

####Localhost
* Ensure node.js is installed (http://nodejs.org)
* CD to the freezing-tribble directory
* sudo npm install
* sudo npm update
* node server.js

####AWS EB
* Create a zip archive containing this app (ensure package.json is in the root)
* Open AWS EB console
* Choose 'upload archive' option.

####Heroku
* https://devcenter.heroku.com/articles/deploying-nodejs

####Azure
* http://azure.microsoft.com/en-us/documentation/articles/cloud-services-nodejs-develop-deploy-app/

## Tested in
* Firefox
* Safari
* Chrome
* iPhone iOS8
* Android Lollipop
* WinPhone 8.1