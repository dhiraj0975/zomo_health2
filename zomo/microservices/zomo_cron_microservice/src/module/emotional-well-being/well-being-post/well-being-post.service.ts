import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    EmotionalWellBeingPostEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class WellBeingPostService extends BaseService<EmotionalWellBeingPostEntity> {
    constructor(
        @InjectRepository(
            EmotionalWellBeingPostEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaWellbeingPostRepository: Repository<EmotionalWellBeingPostEntity>,
        @InjectRepository(
            EmotionalWellBeingPostEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaWellbeingPostRepository: Repository<EmotionalWellBeingPostEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaWellbeingPostRepository,
            writeReplicaWellbeingPostRepository,
            'wellBeingPost',
            commonArrayService,
        );
    }
}
