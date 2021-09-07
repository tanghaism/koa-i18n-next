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
  locales: ['en', 'zh', 'zh-TW'], // 语种白名单，未添加进入的语种不会加载语言文件，不会返回对应的文案
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
    message: ctx.$t('test', ['!haha'])
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
