import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonService,
    InterlinksEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class InterlinksService extends BaseService<InterlinksEntity> {
    constructor(
        @InjectRepository(
            InterlinksEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaInterlinksRepository: Repository<InterlinksEntity>,
        @InjectRepository(InterlinksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaInterlinksRepository: Repository<InterlinksEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaInterlinksRepository,
            writeReplicaInterlinksRepository,
            'user',
            commonArrayService,
        );
    }
}
