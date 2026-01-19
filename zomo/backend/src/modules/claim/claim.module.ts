import { appConstant, ClaimCodesEntity, ClaimReportsEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimCodeController } from "./claimcodes/claimcode.controller";
import { ClaimCodeService } from "./claimcodes/claimcode.service";
import { ClaimReportsController } from "./claimreports/claimreports.controller";
import { ClaimReportsService } from "./claimreports/claimreports.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([ClaimCodesEntity, ClaimReportsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([ClaimCodesEntity, ClaimReportsEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [ClaimCodeService, ClaimReportsService],
    controllers: [ClaimCodeController, ClaimReportsController],
    exports: [ClaimCodeService, ClaimReportsService],
})
export class ClaimModule {}
