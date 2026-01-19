import {
    appConstant,
    BaseService,
    CommonArrayService,
    DentistsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class DentistsService extends BaseService<DentistsEntity> {
    constructor(
        @InjectRepository(
            DentistsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaDentistsRepository: Repository<DentistsEntity>,
        @InjectRepository(DentistsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDentistsRepository: Repository<DentistsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaDentistsRepository,
            writeReplicaDentistsRepository,
            'dentists',
            commonArrayService,
        );
    }
}
