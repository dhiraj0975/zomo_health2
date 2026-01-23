import { Module } from '@nestjs/common';
import { AppActivityLogConfigProvider } from './app-config.provider';
@Module({
    providers: [AppActivityLogConfigProvider],
    exports: [AppActivityLogConfigProvider],
})
export class AppActivityLogConfigModule {}
