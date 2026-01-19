import { appConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FoodFeedEntity } from 'src/entity';
import { Repository } from 'typeorm';
@Injectable()
export class FoodFeedService {
    constructor(
        @InjectRepository(FoodFeedEntity,appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFoodFeedRepository: Repository<FoodFeedEntity>,
        @InjectRepository(FoodFeedEntity,appConstant.MAIN.toLowerCase())
        private readonly writeReplicaFoodFeedRepository: Repository<FoodFeedEntity>,
    ) {}
    async create(data: any) {
        const savedResult = this.writeReplicaFoodFeedRepository.create(data);
        return await this.writeReplicaFoodFeedRepository.save(savedResult);
    }
}
