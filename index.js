const fs = require('fs');
const formidable = require('formidable');

function multipartHandle(ctx, form) {
  return new Promise((resolve, reject) => {
    form.parse(ctx.req, function (err, fields, files) {
      if (err) {
        reject(err);
      } else {
        resolve({
          fields,
          files
        });
      }
    });
  });
}

module.exports = function (options = {}) {

  const defaults = {
    uploadDir: undefined,
    autoDelete: false,
    maxFileSize: 200 * 1024 * 1024
  }

  options = Object.assign(defaults, options);

  return async (ctx, next) => {
    const form = new formidable.IncomingForm();

    if (defaults.uploadDir) {
      form.uploadDir = defaults.uploadDir;
    }

    form.maxFileSize = defaults.maxFileSize;

    const args = await multipartHandle(ctx, form);
    ctx = Object.assign(ctx, args);

    await next();

    if (options.autoDelete) {
      for (let key in args.files) {
        fs.unlinkSync(args.files[key].path);
      }
    }
  }
}