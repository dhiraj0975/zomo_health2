import {
    ActivityFeedsEntity, appConstant, BodyFeedsEntity,
    FoodFeedsEntity,
    FoodNutritionValueEntity,
    FtBiometricsEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from "@nestjs/typeorm";
import { ActivityFeedsController } from './activityfeeds/activityfeeds.controller';
import { ActivityFeedService } from './activityfeeds/activityfeeds.service';
import { FtAuthorizedUsersController } from './authorizedusers/authorizedusers.controller';
import { FtBiometricsController } from './biometrics/biometrics.controller';
import { FtBiometricsService } from './biometrics/biometrics.service';
import { BodyFeedsController } from './bodyfeeds/bodyfeeds.controller';
import { BodyFeedService } from './bodyfeeds/bodyfeeds.service';
import { FoodDataController } from './fooddata/fooddata.controller';
import { FoodFeedsController } from './foodfeeds/foodfeeds.controller';
import { FoodFeedService } from './foodfeeds/foodfeeds.service';
import { FoodNutritionValuesController } from './foodnutritionvalue/foodnutritionvalue.controller';
import { FoodNutritionValuesService } from './foodnutritionvalue/foodnutritionvalue.service';
import { FoodWeightController } from './foodweight/foodweight.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([FoodFeedsEntity, ActivityFeedsEntity, FtBiometricsEntity, BodyFeedsEntity, FoodNutritionValueEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([FoodFeedsEntity, ActivityFeedsEntity, FtBiometricsEntity, BodyFeedsEntity, FoodNutritionValueEntity], appConstant.MAIN.toLowerCase())
    ],
    providers: [FoodFeedService, ActivityFeedService, FtBiometricsService, BodyFeedService, FoodNutritionValuesService,
        {
            provide: 'FOOD_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.FOOD_SERVICE_HOST_PROD,
                        port: Number(process.env.FOOD_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'CRON_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.CRON_SERVICE_HOST_PROD,
                        port: Number(process.env.CRON_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        {
            provide: 'FITBIT_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.FITBIT_SERVICE_HOST_PROD,
                        port: Number(process.env.FITBIT_SERVICE_PORT_PROD),
                    }
                })
            }
        },
    ],
    controllers: [
        FoodFeedsController,
        ActivityFeedsController,
        FtAuthorizedUsersController,
        FtBiometricsController,
        BodyFeedsController,
        FoodNutritionValuesController,
        FoodDataController,
        FoodWeightController,
    ],
    exports: [FoodFeedService, ActivityFeedService, FtBiometricsService, BodyFeedService, FoodNutritionValuesService],
})
export class TrackerModule {
}
