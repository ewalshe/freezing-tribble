# FreezingTribble

Super simple point of interest mapping app.

Comes with simple node.js file flinger, but contents of /public can live anywhere. Model resides in /public/map.json.

## Demo

https://freezing-tribble.herokuapp.com

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