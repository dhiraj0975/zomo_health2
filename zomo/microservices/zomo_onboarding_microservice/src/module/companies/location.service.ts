import {
    appConstant,
    BaseService,
    CommonArrayService,
    LocationsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class LocationService extends BaseService<LocationsEntity> {
    constructor(
        @InjectRepository(
            LocationsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaLocationsRepository: Repository<LocationsEntity>,
        @InjectRepository(LocationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLocationsRepository: Repository<LocationsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaLocationsRepository,
            writeReplicaLocationsRepository,
            'department',
            commonArrayService,
        );
    }
}
