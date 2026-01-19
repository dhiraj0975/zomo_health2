import {
    appConstant,
    CardsEntity,
    CommonArrayService,
    BaseService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CardsService extends BaseService<CardsEntity> {
    constructor(
        @InjectRepository(CardsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCardsRepository: Repository<CardsEntity>,
        @InjectRepository(CardsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCardsRepository: Repository<CardsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaCardsRepository,
            writeReplicaCardsRepository,
            'cards',
            commonArrayService,
        );
    }
}
