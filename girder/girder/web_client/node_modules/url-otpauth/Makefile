all:
	mkdir -p dist

	./node_modules/.bin/browserify index.js -o dist/url-otpauth.js
	./node_modules/.bin/browserify -d index.js -o dist/url-otpauth.debug.js
	./node_modules/.bin/uglifyjs --screw-ie8 -o dist/url-otpauth.min.js --source-map dist/url-otpauth.min.js.map dist/url-otpauth.js


doc:
	./node_modules/.bin/jsdoc -c jsdoc.json


test: all
	./node_modules/.bin/browserify test/test.js > test/browser/index.js

	./node_modules/.bin/istanbul cover ./node_modules/mocha/bin/_mocha --report lcovonly -- -R spec test && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js && rm -rf ./coverage
	./node_modules/.bin/mocha-phantomjs test/browser/index.html


.PHONY: all doc test
