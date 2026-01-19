import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(UserEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserRepository: Repository<UserEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaUserRepository.create(data);
        return await this.writeReplicaUserRepository.save(savedResult);
    }
}
