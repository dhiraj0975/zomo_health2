import { appConstant, CompanyReportMenuSettingsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
@Injectable()
export class ReportMenuSettingsService {
    constructor(
        @InjectRepository(CompanyReportMenuSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicareportMenuSettingsRepository: Repository<CompanyReportMenuSettingsEntity>,
    ) {
    }
    async findOne(condition: any) {
        return await this.readReplicareportMenuSettingsRepository.findOne({
            where: condition,
        });
    }
}