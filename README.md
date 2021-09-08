# koa-i18n-next
i18n middleware based on koa2. Support typescript project and ejs template!

## Install

```shell
npm install koa-i18n-next

// or

yarn add koa-i18n-next
```

## Options

|     props     |      type       | default | required | remark                        |
| :-----------: | :-------------: | :-----: | :------: | ----------------------------- |
|    dirPath    |     string      |         |    Yes   | Languages folder path         |
|fallbackLocale |     string      |         |    Yes   | To choose which language to use When the language file or language is not matched |
|     modes     |     Modes[]     |         |    YES   | How to get the current requested language, For detailed parameters, see Modes type below |
|    preload    |    string[]     |         |   False  | Language files that need to be preloaded, it is not recommended to set too many languages |

```ts
type Modes = 'query' | 'subdomain' | 'cookie' | 'header' | 'tld' | Function;

// The priority of acquiring languages is arranged according to the order of the array. If none of them are acquired, the language set by fallbackLocale will be used.
modes = [
  'query',                //  optional detect querystring - `/?locale=en-US`
  'subdomain',            //  optional detect subdomain   - `zh-CN.koajs.com`
  'cookie',               //  optional detect cookie      - `Cookie: locale=zh-TW`
  'header',               //  optional detect header      - `Accept-Language: zh-CN,zh;q=0.5`
  'tld',                  //  optional detect tld(the last domain) - `koajs.cn`
  function(ctx) {         //  optional custom function (will be bound to the koa context)
    return ctx.request.header['lang'] || 'en'
  }
]
```

## Props
Get the language in the context
1. <code>Router</code>
```ts
router.get('/', async (ctx) => {
  ctx.body = {
    locale: ctx.state.$locale // ==> or ctx.$locale
  }
})
```
2. <code>Ejs</code>
```html
<h1><%= $locale %></h1>
```
## Methods

```ts
// @param key: The key corresponding to the text in the language file
// @param data?: What needs to be replaced dynamically, Array or object can be passed in
$t: (key: string, data?: string[] | {[props:string]: string}) => string;

// example1
// { testWords: 'This is [0] test words[1]' }
ctx.$t('testWords', ['a', '!']) // ==> This is a test words!

// example2
// { testWords: 'This is {number} test words{punctuation}' }
ctx.$t('testWords', {number: 'a', punctuation: '!'}) // ==> This is a test words!
```


## How to use?

See the [example](./example)

### Use in Ejs template
html template
```html
<h1><%= $t('test') %></h1>  
```
render template
```ts
router.get('/template', async (ctx) => {
  ctx.render('template')
})
```

### Use in router
```ts
router.get('/api', async (ctx) => {
  ctx.body = {
    message: ctx.$t('test')
  }
})
```

### use KoaI18nNext middleware
```js
const path = require('path');
const Koa = require('koa');
const KoaRouter = require('koa-router');
const koaViews = require('koa-views');
const koaI18nNext = require('../index');

const app = new Koa();

app.use(koaI18nNext({
  dirPath: path.join(__dirname, './locales'), // 国际化文案文件夹(语言文件仅支持json格式)
  fallbackLocale: 'en', // 未匹配到语种时使用什么语言代替
  preload: ['en', 'zh'], // 第一次通过中间件时预加载的语种，不宜添加过多，添加经常使用的语种即可
  modes: [
    'query',                //  通过 url query 获取 - `/?locale=en-US`
    'subdomain',            //  通过二级域名获取   - `zh-CN.koajs.com`
    'cookie',               //  通过cookie获取      - `Cookie: locale=zh-TW`
    'header',               //  通过header头的accept-language获取      - `Accept-Language: zh-CN,zh;q=0.5`
    'tld',                  //  通过国际域名获取，此案例为cn - `koajs.cn`
    function(ctx) {         //  通过自定函数获取，返回语种 (ctx为app context)
      return ctx.request.header['lang'] || 'en'
    }
  ], // 获取语种的方式，获取语种的优先级根据数组顺序排列，取到白名单语种为止，如果均没有获取到，则使用fallbackLocale设置的语种
}))

// 模版引擎
// https://github.com/mde/ejs
app.use(
  koaViews(path.join(__dirname, './template'), {
    extension: 'ejs',
  }),
);

const router = new KoaRouter();

router.get('/api', async (ctx) => {
  ctx.body = {
    message: ctx.$t('test')
  }
})

router.get('/', async (ctx) => {
  await ctx.render('error')
})

// 初始化路由配置
// https://github.com/koajs/router
app.use(router.routes());




app.listen(3000, () => {
  console.log('serve start success!');
  console.log('http://localhost:3000?locale=zh-tw');
  console.log('http://localhost:3000/api?locale=en');
})
```
