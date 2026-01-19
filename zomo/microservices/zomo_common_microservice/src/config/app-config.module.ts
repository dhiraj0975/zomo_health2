import { Module } from '@nestjs/common';
import { AppCommonConfigProvider } from './app-config.provider';

@Module({
    providers: [AppCommonConfigProvider],
    exports: [AppCommonConfigProvider],
})
export class AppCommonConfigModule {}
