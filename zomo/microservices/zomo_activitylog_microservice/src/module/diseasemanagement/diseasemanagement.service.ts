import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DiseaseManagementEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class DiseaseManagementService {
    constructor(
        @InjectRepository(DiseaseManagementEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDiseaseManagementRepository: Repository<DiseaseManagementEntity>,
        @InjectRepository(DiseaseManagementEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDiseaseManagementRepository: Repository<DiseaseManagementEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaDiseaseManagementRepository.create(data);
        return await this.writeReplicaDiseaseManagementRepository.save(savedResult);
    }
}
