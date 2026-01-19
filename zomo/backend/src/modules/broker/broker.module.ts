import { appConstant, BrokerEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrokerController } from "./broker.controller";
import { BrokerService } from "./broker.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([BrokerEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([BrokerEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [BrokerService],
    controllers: [BrokerController],
    exports: [BrokerService],
})
export class BrokerModule {}
