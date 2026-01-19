import {
    appConstant,
    BaseService,
    CommonArrayService,
    SubmitedFormsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SubmitFormsService extends BaseService<SubmitedFormsEntity> {
    constructor(
        @InjectRepository(
            SubmitedFormsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaSubmitedFormsRepository: Repository<SubmitedFormsEntity>,
        @InjectRepository(SubmitedFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSubmitedFormsRepository: Repository<SubmitedFormsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaSubmitedFormsRepository,
            writeReplicaSubmitedFormsRepository,
            'submitedForms',
            commonArrayService,
        );
    }
}
