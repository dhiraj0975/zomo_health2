import { Module } from '@nestjs/common';
import { AppOnboardingConfigProvider } from './app-onboarding-config-provider.service';

@Module({
    providers: [AppOnboardingConfigProvider],
    exports: [AppOnboardingConfigProvider],
})
export class AppOnboardingConfigModule {}
