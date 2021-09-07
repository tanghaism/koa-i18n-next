const path = require('path');
const fs = require('fs');

class KoaI18nNext {
  constructor(options) {
    if (!options) {
      throw new Error('KoaI18nNext 需要传入配置项');
    }

    const {
      dirPath,
      preload = [],
      locales = [],
      fallbackLocale,
      modes = ['query', 'subdomain', 'cookie', 'header'],
    } = options;

    this.dirPath = dirPath;
    this.preload = preload;
    this.fallbackLocale = fallbackLocale;
    this.modes = modes;
    this.fileExt = '.json';

    // 已读取的国际化文案
    this.messages = {};
    // 可以匹配的所有语言
    this.locales = locales;
    const _preload = [...this.preload];
    if (this.fallbackLocale) _preload.unshift(this.fallbackLocale);
    this.loadLocaleFile(_preload);
  }

  // 根据文案标示翻译
  $t(message, key, value) {
    let msg = message[key];
    if (!value || !msg) {
      return msg;
    }
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        let reg = new RegExp('\\[' + i + '\\]', 'g');
        msg = msg.replace(reg, value[i].toString());
      }
    } else if (typeof value === 'object') {
      Object.keys(value).forEach(valueKey => {
        let reg = new RegExp('\\{' + valueKey + '\\}', 'g');
        msg = msg.replace(reg, value[valueKey].toString());
      });
    }
    return msg;
  }
  // 根据mode获取语言
  getLocale(ctx) {
    const { request, cookies } = ctx;
    let _locale;
    for (let mode of this.modes) {
      switch (mode) {
        case 'query': {
          const { locale } = request.query;
          if (locale && this.locales.includes(locale)) {
            _locale = locale;
          }
          break;
        }
        case 'subdomain': {
          if (request.subdomains.length > 0) {
            for (let subdomain of request.subdomains) {
              if (this.locales.includes(subdomain)) {
                _locale = subdomain;
                break;
              }
            }
          }
          break;
        }
        case 'cookie': {
          const locale = cookies.get('locale');
          if (locale && this.locales.includes(locale)) {
            _locale = locale;
          }
          break;
        }
        case 'header': {
          const locale = request.headers['accept-language'];
          if (locale && this.locales.includes(locale)) {
            _locale = locale;
          }
          break;
        }
        default: {
          if (typeof mode === 'function') {
            const locale = mode(ctx);
            if (locale && this.locales.includes(locale)) {
              _locale = locale;
            }
          }
          break;
        }
      }
      if (_locale) break;
    }
    return _locale || this.fallbackLocale;
  }

  // 使用文件系统读取
  _readFile(locale) {
    const fullPath = path.normalize(this.dirPath + '/' + locale + this.fileExt);
    try {
      const data = fs.readFileSync(fullPath);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('未发现语言文件：' + fullPath);
    }
    return {};
  }

  // 加载文件内容
  loadLocaleFile(locale) {
    if (!locale) return;
    if (typeof locale === 'string' && !this.messages[locale]) {
      this.messages[locale] = this._readFile(locale);
    } else if (Array.isArray(locale)) {
      for (let fileName of locale) {
        if (this.messages[fileName]) continue;
        this.messages[fileName] = this._readFile(fileName);
      }
    }
  }
}

function KoaI18nNextMiddleware(options) {

  const i18n = new KoaI18nNext(options);

  return async (ctx, next) => {
    if(ctx.app.i18n){
      ctx.app.i18n = i18n;
    }
    const locale = i18n.getLocale(ctx);
    i18n.loadLocaleFile(locale);
    const message = i18n.messages[locale] || {};
    ctx.$t = ctx.state.$t = (key, value) => {
      return i18n.$t(message, key, value);
    };
    return await next();
  };
}

module.exports = KoaI18nNextMiddleware
