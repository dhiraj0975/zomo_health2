import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ReimbursementEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ReimbursementService {
    constructor(
        @InjectRepository(ReimbursementEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaReimbursementRepository: Repository<ReimbursementEntity>,
        @InjectRepository(ReimbursementEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaReimbursementRepository: Repository<ReimbursementEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaReimbursementRepository.create(data);
        return await this.writeReplicaReimbursementRepository.save(savedResult);
    }
}
