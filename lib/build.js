'use strict';

var fs      = require('fs');
var exec 	= require('child_process').exec;

var mimeTypes = {
	'woff': 'application/x-font-woff',
	'ttf': 'font/opentype',
	'otf': 'font/opentype'
}

function buildFontFaceRule(fonts) {
	var css = '';
	for (var i = 0, j = fonts.length; i<j; ++i) {
		var font = fonts[i];
		css += '@font-face{font-family:' + font['font-family'] + ';';
		css += (font['font-weight'] && font['font-weight'] !== 'regular') ? 'font-weight:' + font['font-weight'] + ';' : 'font-weight:normal;';
		css += (font['font-style']) ? 'font-style:' + font['font-style'] + ';' : 'font-style:normal;';
		css += 'src:url(data:' + mimeTypes[font.format] + ';base64,' + font.base64 + ');}';
	}
	return css;
}

function createFontFile(fontJson, callback) {

	var callbacks = 0;
	var fonts = [];
	fontJson.fonts.forEach(function(font) {
		fs.readFile(font.file, 'utf8', function(e, data) {
			console.log('Reading file: ' + font.file);

			// I tried lots of things to buffer the binary input, and encode to base64 within node.
			// None of them came out as valid font-files, so I'm falling back to what I run on the CLI, which works (on my machine!)
			exec("openssl base64 < " + font.file + " | tr -d '\n'", function(error, stdout, stderr) {
				if (!error && !stderr && stdout) {
					font.base64 = stdout;
					fonts.push(font);

					callbacks++;
					if (callbacks === fontJson.fonts.length) {
						var fileJson = {
							'name': font['font-family'],
							'css': buildFontFaceRule(fonts)
						}
						var out = fontJson['callback'] + '(' + JSON.stringify(fileJson) + ');';
						fs.writeFileSync(fontJson['filename'], out);
						callback();
					}
				} else {
					console.log("Encoding failed.");
					console.log(error, stderr);
				}
			});
		});
	});
}

function buildFontFiles(fontListJson, callback) {
	console.log(fontListJson);
	var callbacks = 0;
	fontListJson.forEach(function(fontFile) {
		createFontFile(fontFile, function() {
			callbacks++;
			if (callbacks === fontListJson.length) {
				callback();
			}
		})
	})
}

module.exports = {
	buildFontFiles: buildFontFiles
}