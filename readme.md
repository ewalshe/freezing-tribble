#places

Super simple point of interest mapping app for desktop and mobile.

Comes with simple node.js file flinger, but the contents of /public can live on any HTTP server.

##Demo

https://freezing-tribble.herokuapp.com

##Features

* Fast full screen mapping
* Responsive layout
* Fuzzy search
* Host anywhere
* Easy installation and setup

##Config

####Basic configuration

Setup is split between the default state of the map, and information about each marker.

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
                "title"         : "First place of interest",
                "summary"       : "A summary",
                "lat"           : 52.3755991766591,
                "lng"           : -7.789306640625,
                "order"         : 3,
                "icon"          : "media/img/themes/red/flag.png",
                "image"         : "media/img/info.png",
                "detail"        : "<p>Markup for first item</p>"
            }
        ]
    }

Basic configuration covers where the map initial defaults to, the zoom level, and how long it takes to display an information modal.

* config.showOverlayDelay:  delay between choose a marker from search or navigation, and triggering information modal. Facilitates Google maps panning for spatial recognition
* config.proximity:         unimplimented. Hints to markers in proximity with present marker in overlay
* config.map.lat:           Latitude for initial map state
* config.map.lng:           Longitude for initial map state
* config.map.zoom:          Zoom level for initial map state

Each marker needs some information to be useful

* title:    a title for
* summary:  a short hint or teaser
* lat:      latitude for this marker    (clicking anywhere on the map with the console open will share this detail)
* lng:      longitude for this marker   (clicking anywhere on the map with the console open will share this detail)
* order:    unimplimented. A hint to the ranking of this marker (1 = most important)
* icon:     filepath to icon displayed for this marker
* image:    filepath to 'hero' image displayed in information modal for this marker
* detail:   HTML fragment describing this marker

Configuration files created with the setup wizard will also contain a markdown key.


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

##Installation

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