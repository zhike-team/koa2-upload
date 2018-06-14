const fs = require('fs');
const formidable = require('formidable');
const Readable = require('stream').Readable;

function multipartHandle(ctx, form, options) {
  return new Promise((resolve, reject) => {

    let streams = {};

    form.parse(ctx.req, function (err, fields, files) {
      if (err) {
        reject(err);
      } else {
        if (options.stream) {
          resolve({
            fields,
            files: streams
          });
        } else {
          resolve({
            fields,
            files
          });
        }
      }
    });

    form.onPart = function (part) {
      if (!options.stream) {
        form.handlePart(part);
      } else {
        if (!part.filename) {
          form.handlePart(part);
        } else {
          streams[part.name] = {
            stream: new Readable(),
            filename: part.filename,
            type: part.mime,
            size: 0
          }
          streams[part.name].stream._read = function () {};

          part.on('data', function (chunk) {
            streams[part.name].size += chunk.length;
            streams[part.name].stream.push(chunk);
          });

          part.on('end', function () {
            streams[part.name].stream.push(null);
          });
        }
      }
    }
  });
}

module.exports = function (options = {}) {

  const defaults = {
    uploadDir: undefined,
    autoDelete: false,
    maxFileSize: 200 * 1024 * 1024,
    stream: false
  }

  options = Object.assign(defaults, options);

  return async (ctx, next) => {
    const form = new formidable.IncomingForm();

    if (defaults.uploadDir) {
      form.uploadDir = defaults.uploadDir;
    }

    form.maxFileSize = defaults.maxFileSize;

    const args = await multipartHandle(ctx, form, options);
    ctx = Object.assign(ctx, args);

    await next();

    if (!options.stream && options.autoDelete) {
      for (let key in args.files) {
        fs.unlinkSync(args.files[key].path);
      }
    }
  }
}