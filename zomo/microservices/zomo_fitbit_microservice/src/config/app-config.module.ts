import { Module } from '@nestjs/common';
import { AppFitbitConfigProvider } from './app-config.provider';

@Module({
    providers: [AppFitbitConfigProvider],
    exports: [AppFitbitConfigProvider],
})
export class AppTimezoneConfigModule {}
