import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CovidEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class CovidService {
    constructor(
        @InjectRepository(CovidEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCovidRepository: Repository<CovidEntity>,
        @InjectRepository(CovidEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCovidRepository: Repository<CovidEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaCovidRepository.create(data);
        return await this.writeReplicaCovidRepository.save(savedResult);
    }
}
