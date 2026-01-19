import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
    appConstant,
    OnboardingEntity,
    BaseService,
    CommonArrayService,
} from '@common-constants';

@Injectable()
export class OnboardingService extends BaseService<OnboardingEntity> {
    constructor(
        @InjectRepository(
            OnboardingEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaOnboardingProgressRepository: Repository<OnboardingEntity>,
        @InjectRepository(OnboardingEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaOnboardingProgressRepository: Repository<OnboardingEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaOnboardingProgressRepository,
            writeReplicaOnboardingProgressRepository,
            'onboard',
            commonArrayService,
        );
    }
}
