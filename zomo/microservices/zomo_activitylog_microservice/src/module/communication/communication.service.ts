import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CommunicationService {
    constructor(
        @InjectRepository(CommunicationEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCommunicationRepository: Repository<CommunicationEntity>,
        @InjectRepository(CommunicationEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCommunicationRepository: Repository<CommunicationEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCommunicationRepository.create(data);
        return await this.writeReplicaCommunicationRepository.save(savedResult);
    }
}
