import {
    appConstant,
    OrgThemesEntity,
    BaseService,
    CommonArrayService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class OrgThemesService extends BaseService<OrgThemesEntity> {
    constructor(
        @InjectRepository(
            OrgThemesEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaOrgThemesRepository: Repository<OrgThemesEntity>,
        @InjectRepository(OrgThemesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaOrgThemesRepository: Repository<OrgThemesEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaOrgThemesRepository,
            writeReplicaOrgThemesRepository,
            'orgthemes',
            commonArrayService,
        );
    }
}
