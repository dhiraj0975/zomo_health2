import { ActivityEntity, appConstant, CategoryEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityController } from "./activity/activity.controller";
import { ActivityService } from "./activity/activity.service";
import { CategoryController } from "./category/category.controller";
import { CategoryService } from "./category/category.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([ActivityEntity, CategoryEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([ActivityEntity, CategoryEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [
        ActivityService,CategoryService
    ],
    controllers: [ActivityController,CategoryController],
    exports: [ActivityService,CategoryService],
})
export class ActivityModule {}
