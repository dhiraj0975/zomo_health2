import { Injectable } from '@nestjs/common';
import { en, es } from '../locales';
@Injectable()
export class LocaleService {
    /*
     * Get message for specific locale
     * - message is mandatory param
     * - Default locale is en(English)
     */
    getMessage(message, locale = 'en') {
        let localeMessage = '';
        switch (locale) {
            case 'en':
                localeMessage = en[message];
                break;
            case 'es':
                localeMessage = es[message];
                break;
        }
        return localeMessage;
    }
}
