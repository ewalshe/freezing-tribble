/***************************************************
*                       SiMpL3S
****************************************************
*
*   About:  Simple node based HTTP file flinger
*
****************************************************/
var port = process.env.PORT || process.env.port || 8081,
    staticFiles = require('node-static'),
    fileServer = new staticFiles.Server('./public');


// Listen for HTTP requests
require('http').createServer(function (req, res) {
    if (req.url === '/') {
        req.url = '/index.html'
    }

    try {
        fileServer.serve(req, res);
    } catch (e) {
        console.log(e);
        res.writeHead(404);
        res.end('404');
    }
}).listen(port);


console.log('SiMpL3S now listening on port ' + port);