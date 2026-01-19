import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppFoodDataConfigModule } from './config/app-food-data-config.module';
import {
    DataSrcEntity,
    DataSrcLnEntity,
    DerivCdEntity,
    FoodDescEntity,
    FoodGroupEntity,
    FootNoteEntity,
    LangDescEntity,
    LangualEntity,
    NutritionDataEntity,
    NutritionDefEntity,
    SourceCodeEntity,
    WeightEntity,
} from './entity';
import {
    DataSrcController,
    DataSrcLnController,
    DataSrcLnService,
    DataSrcService,
    FoodDescriptionController,
    FoodDescriptionService,
    FoodGroupController,
    FoodGroupService,
    FootnoteController,
    FootNoteService,
    LangDescriptionController,
    LangDescriptionService,
    LangualController,
    LangualService,
    NutrientDataController,
    NutrientDataService,
    NutrientDefinitionController,
    NutrientDefinitionService,
    SourceCodeController,
    SourceCodeService,
    WeightController,
    WeightService,
} from './module';
import { AppFoodConfigProvider } from './config/app-food-data-config-provider.service';
import { appConstant } from './constant';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [AppFoodDataConfigModule],
            name: appConstant.MAIN.toLowerCase(),
            useFactory: (configService: AppFoodConfigProvider) => {
                return {...configService.typeOrmConfig, name: configService.typeOrmConfig.name};
            },
            inject: [AppFoodConfigProvider],
        }),
        TypeOrmModule.forRootAsync({
            imports: [AppFoodDataConfigModule],
            name: appConstant.READ_REPLICA.toLowerCase(),
            useFactory: (configService: AppFoodConfigProvider) => {
                return {...configService.typeOrmConfig1, name: configService.typeOrmConfig1.name};
            },
            inject: [AppFoodConfigProvider],
        }),
        TypeOrmModule.forFeature([
            DataSrcLnEntity,
            DataSrcEntity,
            DerivCdEntity,
            FoodDescEntity,
            FoodGroupEntity,
            FootNoteEntity,
            LangDescEntity,
            LangualEntity,
            NutritionDataEntity,
            NutritionDefEntity,
            SourceCodeEntity,
            WeightEntity,
        ], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([
            DataSrcLnEntity,
            DataSrcEntity,
            DerivCdEntity,
            FoodDescEntity,
            FoodGroupEntity,
            FootNoteEntity,
            LangDescEntity,
            LangualEntity,
            NutritionDataEntity,
            NutritionDefEntity,
            SourceCodeEntity,
            WeightEntity,
        ], appConstant.MAIN.toLowerCase()),
    ],
    controllers: [
        AppController,
        DataSrcController,
        FoodDescriptionController,
        FoodGroupController,
        FootnoteController,
        LangDescriptionController,
        LangualController,
        NutrientDataController,
        NutrientDefinitionController,
        SourceCodeController,
        WeightController,
        DataSrcLnController
    ],
    providers: [
        AppService,
        DataSrcService,
        FoodDescriptionService,
        FoodGroupService,
        FootNoteService,
        LangDescriptionService,
        LangualService,
        NutrientDataService,
        NutrientDefinitionService,
        SourceCodeService,
        WeightService,
        DataSrcLnService
    ],
})
export class AppModule {}
