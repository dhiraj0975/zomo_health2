import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClaimEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ClaimService {
    constructor(
        @InjectRepository(ClaimEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaClaimRepository: Repository<ClaimEntity>,
        @InjectRepository(ClaimEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaClaimRepository: Repository<ClaimEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaClaimRepository.create(data);
        return await this.writeReplicaClaimRepository.save(savedResult);
    }
}
