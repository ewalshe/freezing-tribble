/***************************************************
*                       SiMpL3S
****************************************************
*
*   About:  Simple node based HTTP file flinger
*
****************************************************/
var port = process.env.PORT || process.env.port || 8081,
    staticFiles = require('node-static'),
    zlib = require('zlib'),
    fs = require('fs'),
    fileServer;


// Setup static file server
fileServer = new staticFiles.Server('./public', {
    gzip:		true,
    serverInfo:	'S'
});


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


// Find and gzip static contents
var gzipStaticContents = (function () {
    var compressAsset = function (fileName) {
        var input = fs.createReadStream(fileName),
            output = fs.createWriteStream(fileName + '.gz');

        input.pipe(zlib.createGzip()).pipe(output);
    };

    var compressStaticAssets = function (folder) {
        var canCompress = ['css', 'html', 'htm', 'js', 'json', 'svg', 'txt'];

        traverseFileSystem(folder, function (currentFile, currentPath) {
            var fName = currentFile.split('.'),
                extension = fName[fName.length - 1].toLowerCase();

            if (fName && fName.length > 0 && extension) {
                if (canCompress.indexOf(extension) > -1) {
                    compressAsset(currentFile);
                }
            }
        });
    };

    var traverseFileSystem = function (currentPath, func) {
        var files = fs.readdirSync(currentPath),
            currentFile, stats, key;

        for (key in files) {
            currentFile = currentPath + '/' + files[key];
            stats = fs.statSync(currentFile);

            if (stats.isFile()) {
                if (func) {
                    func(currentFile, currentPath)
                }
            } else if (stats.isDirectory()) {
                traverseFileSystem(currentFile, func);
            }
        }
    };

    try {
        compressStaticAssets('./public/');
    } catch(ignore) {}
} ());


console.log('SiMpL3S now listening on port ' + port);