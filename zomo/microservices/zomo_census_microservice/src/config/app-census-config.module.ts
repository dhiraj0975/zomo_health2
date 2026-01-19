import { Module } from '@nestjs/common';
import { AppCensusConfigProvider } from './app-census-config-provider.service';

@Module({
    providers: [AppCensusConfigProvider],
    exports: [AppCensusConfigProvider],
})
export class AppCensusConfigModule {}
