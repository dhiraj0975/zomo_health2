import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserOtherEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class UserOtherService {
    constructor(
        @InjectRepository(UserOtherEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserOtherRepository: Repository<UserOtherEntity>,
        @InjectRepository(UserOtherEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserOtherRepository: Repository<UserOtherEntity>,
    ) { }
    async create(data: any) {
        const savedResult = this.writeReplicaUserOtherRepository.create(data);
        return await this.writeReplicaUserOtherRepository.save(savedResult);
    }
}
