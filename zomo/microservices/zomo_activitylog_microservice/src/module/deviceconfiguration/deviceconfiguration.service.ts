import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeviceConfigurationEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class DeviceConfigurationService {
    constructor(
        @InjectRepository(DeviceConfigurationEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDeviceConfigurationRepository: Repository<DeviceConfigurationEntity>,
        @InjectRepository(DeviceConfigurationEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDeviceConfigurationRepository: Repository<DeviceConfigurationEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaDeviceConfigurationRepository.create(data);
        return await this.writeReplicaDeviceConfigurationRepository.save(savedResult);
    }
}
