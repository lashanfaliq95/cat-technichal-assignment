// Added .promises to allow fs to support promises
const { writeFile } = require('fs').promises;
const { join } = require('path');
const request = require('request');
const blend = require('@mapbox/blend');
const argv = require('minimist')(process.argv.slice(2));

// Move these to constants to make the code more maintainable/flexible to change
const [
  DEFAULT_GREETING,
  DEFAULT_USER,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_COLOR,
  DEFAULT_SIZE
] = ['Hello', 'You', 400, 500, 'Pink', 100];
const BASE_URL = 'https://cataas.com/cat/says/';
const OUTPUT_FILE_NAME = 'cat-card.jpg';
const ENCODING_TYPE = 'binary';
const IMAGE_FORMAT = 'jpeg';

const {
  greeting = DEFAULT_GREETING,
  who = DEFAULT_USER,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  color = DEFAULT_COLOR,
  size = DEFAULT_SIZE
} = argv;

// Moved this to a function since only one param changed and to reuse the remaining
const generatePath = (pathParam) => ({
  // Moved this to a string literal to make the code more readable
  url: `${BASE_URL}${pathParam}?width=${width}&height=${height}&color=${color}&s=${size}`,
  encoding: ENCODING_TYPE
});

// Converted to a promisified version to avoid nested callbacks
const promisifiedGetRequest = (path) =>
  new Promise((resolve, reject) =>
    request.get(path, (err, res, body) => {
      if (err) {
        return reject(err);
      }
      // Since the status is is printed on each call
      console.log('Received response with status:' + res.statusCode);
      return resolve(body);
    })
  );

const promisifiedBlend = (files, options) =>
  new Promise((resolve, reject) =>
    blend(files, options, (err, data) => {
      if (err) {
        return reject(err);
      }

      return resolve(data);
    })
  );

// Used a immediately invoked async function since promises were used with await and to call it immediately 
(async () => {
  try {
    const firstResponse = promisifiedGetRequest(generatePath(greeting));
    const secondResponse = promisifiedGetRequest(generatePath(who));

    // Since both request don't depend on each other can fire them both asynchronously to increase performance
    const [firstResponseBody, secondResponseBody] = await Promise.all([
      firstResponse,
      secondResponse
    ]);

    const data = await promisifiedBlend(
      [
        {
          buffer: new Buffer(firstResponseBody, ENCODING_TYPE),
          x: 0,
          y: 0
        },
        {
          buffer: new Buffer(secondResponseBody, ENCODING_TYPE),
          x: width,
          y: 0
        }
      ],
      {
        width: width * 2,
        format: IMAGE_FORMAT,
        height
      }
    );

    const fileOut = join(process.cwd(), `/${OUTPUT_FILE_NAME}`);
    await writeFile(fileOut, data, ENCODING_TYPE);
    console.log('The file was saved!');
  } catch (err) {
    // Don't need to handle each error separately since each of them will be caught here.
    console.log(err);
    return;
  }
})();
