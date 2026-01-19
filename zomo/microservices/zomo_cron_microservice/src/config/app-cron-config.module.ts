import { Module } from '@nestjs/common';
import { AppCronConfigProvider } from './app-cron-config-provider.service';

@Module({
    providers: [AppCronConfigProvider],
    exports: [AppCronConfigProvider],
})
export class AppCronConfigModule {}
