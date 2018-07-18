const fs = require('fs');
const formidable = require('formidable');
const Readable = require('stream').Readable;

function getFileName(dir, name, ext, index = 0) {
  let result;
  let filename = `${name}${index ? `(${index})` : ''}${ext}`;
  try {
    fs.accessSync(`${dir}/${filename}`);
    result = getFileName(dir, name, ext, ++index);
  } catch (err) {
    result = filename
  }
  return result;
}

function multipartHandle(ctx, form, options) {
  return new Promise((resolve, reject) => {
    let streams = {};
    form.parse(ctx.req, (err, fields, files) => {
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

    form.on('file', (name, file) => {
      //rename the incoming file to the file's name
      let pointIndex = file.name.lastIndexOf('.');

      file.name = getFileName(form.uploadDir, file.name.substring(0, pointIndex), file.name.substring(pointIndex));
      fs.renameSync(file.path, form.uploadDir + "/" + file.name);
      file.path = form.uploadDir + "/" + file.name;
    });

    form.onPart = (part) => {
      if (!options.stream) {
        form.handlePart(part);
      } else {
        if (!part.filename) {
          form.handlePart(part);
        } else {
          streams[part.name] = {
            stream: new Readable(),
            name: part.filename,
            type: part.mime,
            size: 0
          }
          streams[part.name].stream._read = function () {};

          part.on('data', (chunk) => {
            streams[part.name].size += chunk.length;
            streams[part.name].stream.push(chunk);
          });

          part.on('end', () => {
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

  if (typeof options.uploadDir === 'string') {
    if (options.uploadDir.charAt(options.uploadDir.length - 1) === '/') {
      options.uploadDir = options.uploadDir.substr(0, options.uploadDir.length - 1);
    }
  }

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