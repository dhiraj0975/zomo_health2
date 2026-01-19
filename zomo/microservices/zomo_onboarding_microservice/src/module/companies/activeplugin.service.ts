import {
    ActivePluginsEntity,
    appConstant,
    CommonArrayService,
    BaseService,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ActivePluginService extends BaseService<ActivePluginsEntity> {
    constructor(
        @InjectRepository(
            ActivePluginsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaActivePluginsRepository: Repository<ActivePluginsEntity>,
        @InjectRepository(ActivePluginsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaActivePluginsRepository: Repository<ActivePluginsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaActivePluginsRepository,
            writeReplicaActivePluginsRepository,
            'activeplugins',
            commonArrayService,
        );
    }
}
