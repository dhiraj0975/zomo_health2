import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientManagerAssignEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class ClientManagerAssignService {
    constructor(
        @InjectRepository(ClientManagerAssignEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaClientManagerassignRepository: Repository<ClientManagerAssignEntity>,
        @InjectRepository(ClientManagerAssignEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaClientManagerassignRepository: Repository<ClientManagerAssignEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaClientManagerassignRepository.create(data);
        return await this.writeReplicaClientManagerassignRepository.save(savedResult);
    }
}
