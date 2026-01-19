import {
    appConstant,
    BaseService,
    CommonArrayService,
    EventCategoryEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class EventCategoryService extends BaseService<EventCategoryEntity> {
    constructor(
        @InjectRepository(
            EventCategoryEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaEventCategoryRepository: Repository<EventCategoryEntity>,
        @InjectRepository(EventCategoryEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaEventCategoryRepository: Repository<EventCategoryEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaEventCategoryRepository,
            writeReplicaEventCategoryRepository,
            'eventCategory',
            commonArrayService,
        );
    }
}
