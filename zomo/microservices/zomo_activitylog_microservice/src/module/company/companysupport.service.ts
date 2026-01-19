import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CompanySupportEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CompanySupportService {
    constructor(
        @InjectRepository(CompanySupportEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanySupportRepository: Repository<CompanySupportEntity>,
        @InjectRepository(CompanySupportEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCompanySupportRepository: Repository<CompanySupportEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCompanySupportRepository.create(data);
        return await this.writeReplicaCompanySupportRepository.save(savedResult);
    }
}
