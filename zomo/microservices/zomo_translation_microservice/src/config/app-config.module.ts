import { Module } from '@nestjs/common';
import { AppTranslationConfigProvider } from './app-config.provider';

@Module({
    providers: [AppTranslationConfigProvider],
    exports: [AppTranslationConfigProvider],
})
export class AppTimezoneConfigModule {}
