import { appConstant, UserNotificationEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
@Module({
    imports: [
        TypeOrmModule.forFeature([UserNotificationEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([UserNotificationEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [NotificationsService,NotificationsController],
    controllers: [NotificationsController],
    exports: [NotificationsService, NotificationsController],
})
export class NotificationsModule {}
