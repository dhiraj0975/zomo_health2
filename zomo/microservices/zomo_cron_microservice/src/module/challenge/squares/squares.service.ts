import {
    appConstant,
    BaseService,
    CommonArrayService,
    SquaresEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SquaresService extends BaseService<SquaresEntity> {
    constructor(
        @InjectRepository(SquaresEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSquaresRepository: Repository<SquaresEntity>,
        @InjectRepository(SquaresEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaSquaresRepository: Repository<SquaresEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaSquaresRepository,
            writeReplicaSquaresRepository,
            'squares',
            commonArrayService,
        );
    }
}
