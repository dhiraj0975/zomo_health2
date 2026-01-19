import { Module } from '@nestjs/common';
import { AppFoodConfigProvider } from './app-food-data-config-provider.service';

@Module({
    providers: [AppFoodConfigProvider],
    exports: [AppFoodConfigProvider],
})
export class AppFoodDataConfigModule {}
