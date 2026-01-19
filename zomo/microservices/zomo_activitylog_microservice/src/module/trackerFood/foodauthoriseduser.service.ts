import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizedUserEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class FoodAuthorizedUserService {
    constructor(
        @InjectRepository(AuthorizedUserEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFoodAuthorizedUserRepository: Repository<AuthorizedUserEntity>,
        @InjectRepository(AuthorizedUserEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFoodAuthorizedUserRepository: Repository<AuthorizedUserEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaFoodAuthorizedUserRepository.create(data);
        return await this.writeReplicaFoodAuthorizedUserRepository.save(savedResult);
    }
}
