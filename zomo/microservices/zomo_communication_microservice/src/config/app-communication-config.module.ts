import { Module } from '@nestjs/common';
import { AppCommunicationConfigProvider } from './app-communication-config-provider.service';

@Module({
    providers: [AppCommunicationConfigProvider],
    exports: [AppCommunicationConfigProvider],
})
export class AppCommunicationConfigModule {}
