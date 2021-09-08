import { Context, DefaultContext, Next } from 'koa';
declare module 'koa' {
    interface Application {
        i18n: KoaI18nNext;
    }
    interface DefaultContext {
        $locale: string | undefined;
        $t: (key: string, value?: {
            [props: string]: string | number;
        } | (string | number)[]) => string;
    }
}
interface IMessages {
    [props: string]: {
        [props: string]: string;
    };
}
export declare type I18nNextModes = 'query' | 'subdomain' | 'cookie' | 'header' | 'url' | 'tld';
export declare type I18nNextFileExt = '.json';
export interface I18nNextOptions {
    dirPath: string;
    modes: (I18nNextModes | Function)[];
    preload?: string[];
    fallbackLocale?: string;
}
declare class KoaI18nNext {
    messages: IMessages;
    dirPath: string;
    preload: string[];
    fallbackLocale: string | undefined;
    modes: (string | Function)[];
    locales: string[];
    fileExt: I18nNextFileExt;
    constructor(options: I18nNextOptions);
    $t(message: {
        [props: string]: string;
    }, key: string, value?: {
        [props: string]: string | number;
    } | (string | number)[]): string;
    getLocale(ctx: Context): any;
    _readFile(locale: string): any;
    loadLocaleFile(locale?: string | string[]): void;
}
export default function KoaI18nNextMiddleware(options: I18nNextOptions): (ctx: DefaultContext, next: Next) => Promise<any>;
export {};
