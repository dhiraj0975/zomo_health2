import {
    appConstant,
    BaseService,
    CommonArrayService,
    EmotionalWellBeingCategoryEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class WellBeingCategoryService extends BaseService<EmotionalWellBeingCategoryEntity> {
    constructor(
        @InjectRepository(
            EmotionalWellBeingCategoryEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaWellbeingCategoryRepository: Repository<EmotionalWellBeingCategoryEntity>,
        @InjectRepository(
            EmotionalWellBeingCategoryEntity,
            appConstant.MAIN.toLowerCase(),
        )
        private readonly writeReplicaWellbeingCategoryRepository: Repository<EmotionalWellBeingCategoryEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaWellbeingCategoryRepository,
            writeReplicaWellbeingCategoryRepository,
            'wellBeingCategory',
            commonArrayService,
        );
    }
}
