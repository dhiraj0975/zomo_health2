import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataManagementEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class DataManagementService {
    constructor(
        @InjectRepository(DataManagementEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDataManagementRepository: Repository<DataManagementEntity>,
        @InjectRepository(DataManagementEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDataManagementRepository: Repository<DataManagementEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaDataManagementRepository.create(data);
        return await this.writeReplicaDataManagementRepository.save(savedResult);
    }
}
