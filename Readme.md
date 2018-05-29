# koa2-upload

基于formidable的，适用于koa2的处理文件上传的中间件

## 安装

```sh
npm i --save koa2-upload
```

## 使用方法

```javascript
  const koa = require('koa');
  const app = new Koa();

  const fileHandler = require('koa2-upload');

  app.use(fileHandler({ autoDelete: true }))

  app.use(async (ctx)=>{

    // ctx.fields
    // ctx.files

  })
```
### Options

  autoDelete: 默认值 false ，设置为true在请求结束之后会删除本地缓存文件