import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ActivityLogModule } from './activitylog/activitylog.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
    EmailService,
    S3FileUploader,
    InitializeTranslateClient,
} from './common';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), ActivityLogModule],
    controllers: [AppController],
    providers: [
        AppService,
        EmailService,
        S3FileUploader,
        InitializeTranslateClient,
    ],
    exports: [ActivityLogModule],
})
export class AppModule {}
