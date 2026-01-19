import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BrokerEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class BrokerService {
    constructor(
        @InjectRepository(BrokerEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBrokerRepository: Repository<BrokerEntity>,
        @InjectRepository(BrokerEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBrokerRepository: Repository<BrokerEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaBrokerRepository.create(data);
        return await this.writeReplicaBrokerRepository.save(savedResult);
    }
}
