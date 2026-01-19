import { Module } from '@nestjs/common';
import { AppConfigProvider } from './app-config.provider';

@Module({
    providers: [AppConfigProvider],
    exports: [AppConfigProvider],
})
export class AppConfigModule {} 
