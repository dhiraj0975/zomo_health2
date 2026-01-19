import {
    appConstant,
    BaseService,
    CommonArrayService,
    CompanySettingsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SettingsService extends BaseService<CompanySettingsEntity> {
    constructor(
        @InjectRepository(
            CompanySettingsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaCompanySettingsRepository: Repository<CompanySettingsEntity>,
        @InjectRepository(CompanySettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanySettingsRepository: Repository<CompanySettingsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaCompanySettingsRepository,
            writeReplicaCompanySettingsRepository,
            'companysettings',
            commonArrayService,
        );
    }
}
