import {
    appConstant,
    CommonService,
    CompanySettingsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SettingsService {
    constructor(
        @InjectRepository(
            CompanySettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCompanySettingsRepository: Repository<CompanySettingsEntity>,
        @InjectRepository(CompanySettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanySettingsRepository: Repository<CompanySettingsEntity>,
        private readonly commonService: CommonService,
    ) {}
    async findOne(condition: any, select: any[] = []) {
        return await this.readReplicaCompanySettingsRepository.findOne({
            where: condition,
            select: select,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCompanySettingsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
}
