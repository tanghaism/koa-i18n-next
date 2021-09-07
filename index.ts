import { Context, DefaultContext, Next } from 'koa';
import fs from 'fs';
import path from 'path';

declare module 'koa' {
  interface Application {
    i18n: KoaI18nNext;
  }
  interface DefaultContext {
    $t: (key: string, value?: { [props: string]: string | number } | (string | number)[]) => string;
  }
}

interface IMessages {
  [props: string]: {
    [props: string]: string;
  };
}

export type I18nNextModes = 'query' | 'subdomain' | 'cookie' | 'header' | 'url' | 'tld';

export type I18nNextFileExt = '.json';

export interface I18nNextOptions {
  dirPath: string; // 国际化文案文件夹路径
  modes: (I18nNextModes | Function)[]; // 获取语言的模式或自定义获取方法
  preload?: string[]; // 预加载国际化文件，与文件名保持一致，文件名即为语言标示
  fallbackLocale?: string; // 如果语言加载失败或未发现对应的语言文件，则使用此语言作为文案，不传此项则会报错
  locales: string[]; // 合法的语言（白名单）
}

class KoaI18nNext {
  messages: IMessages;
  dirPath: string;
  preload: string[];
  fallbackLocale: string | undefined; // 默认预加载
  modes: (string | Function)[];
  locales: string[]; // 可以匹配的所有语言
  fileExt: I18nNextFileExt;

  constructor(options: I18nNextOptions) {
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
  $t(
    message: { [props: string]: string },
    key: string,
    value?: { [props: string]: string | number } | (string | number)[],
  ) {
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
  getLocale(ctx: Context) {
    const { request, cookies } = ctx;
    let _locale;
    for (let mode of this.modes) {
      switch (mode) {
        case 'query': {
          const { locale } = request.query;
          if (locale && this.locales.includes(locale.toString())) {
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
          const locale = cookies.get('locale') as string;
          if (locale && this.locales.includes(locale as string)) {
            _locale = locale;
          }
          break;
        }
        case 'header': {
          const locale = request.headers['accept-language'];
          if (locale && this.locales.includes(locale as string)) {
            _locale = locale;
          }
          break;
        }
        case 'tld': {
          const hostname = ctx.hostname.match(/(\.)(?!.*\1).*?$/);
          const locale = hostname && hostname.length > 0 ? hostname[0].slice(1) : undefined;
          if (locale && this.locales.includes(locale as string)) {
            _locale = locale;
          }
          break;
        }
        default: {
          if (typeof mode === 'function') {
            const locale = mode(ctx);
            if (locale && this.locales.includes(locale as string)) {
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
  _readFile(locale: string) {
    const fullPath = path.normalize(this.dirPath + '/' + locale + this.fileExt);
    try {
      const data = fs.readFileSync(fullPath);
      if (data) return JSON.parse(data as unknown as string);
      return {};
    } catch (e) {
      console.warn('未发现语言文件：' + fullPath);
      return {};
    }
  }

  // 加载文件内容
  loadLocaleFile(locale?: string | string[]) {
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

export default function KoaI18nNextMiddleware(options: I18nNextOptions) {
  const i18n = new KoaI18nNext(options);
  return async (ctx: DefaultContext, next: Next) => {
    if(ctx.app.i18n){
      ctx.app.i18n = i18n;
    }
    const locale = i18n.getLocale(ctx as Context);
    i18n.loadLocaleFile(locale);
    const message = i18n.messages[locale] || {};
    ctx.$t = ctx.state.$t = (
      key: string,
      value?: { [props: string]: string | number } | (string | number)[],
    ): string => {
      return i18n.$t(message, key, value);
    };
    return await next();
  };
}
