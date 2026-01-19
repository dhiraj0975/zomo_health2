import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ActivityLogService } from './activitylog.service';
@Module({
    imports: [],
    controllers: [],
    providers: [
        {
            provide: 'ACTIVITYLOG_SERVICE',
            inject: [ConfigService],
            useFactory: () => {
                return ClientProxyFactory.create({
                    transport: Transport.TCP,
                    options: {
                        host: process.env.ACTIVITYLOG_SERVICE_HOST_PROD,
                        port: Number(process.env.ACTIVITYLOG_SERVICE_PORT_PROD),
                    }
                })
            }
        },
        ActivityLogService,        
    ],
    exports: [ActivityLogService],
})
export class ActivityLogModule {}
