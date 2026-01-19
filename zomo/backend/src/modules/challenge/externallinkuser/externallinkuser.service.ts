import { appConstant, BaseService, ChallengeExternalLinkEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ChallengeExternalLinkService extends BaseService<ChallengeExternalLinkEntity> {
    constructor(
        @InjectRepository(ChallengeExternalLinkEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeExternalLinkRepository: Repository<ChallengeExternalLinkEntity>,
        @InjectRepository(ChallengeExternalLinkEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaChallengeExternalLinkRepository: Repository<ChallengeExternalLinkEntity>,
        commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
        super(readReplicaChallengeExternalLinkRepository, writeReplicaChallengeExternalLinkRepository, 'elu', commonArrayService );
    }
}
