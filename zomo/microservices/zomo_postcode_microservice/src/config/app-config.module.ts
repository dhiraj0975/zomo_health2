import { Module } from '@nestjs/common';
import { AppTimezoneConfigProvider } from './app-config.provider';

@Module({
    providers: [AppTimezoneConfigProvider],
    exports: [AppTimezoneConfigProvider],
})
export class AppTimezoneConfigModule {}
