import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CensusEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CensusService {
    constructor(
        @InjectRepository(CensusEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCensusRepository: Repository<CensusEntity>,
        @InjectRepository(CensusEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCensusRepository: Repository<CensusEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCensusRepository.create(data);
        return await this.writeReplicaCensusRepository.save(savedResult);
    }
}
