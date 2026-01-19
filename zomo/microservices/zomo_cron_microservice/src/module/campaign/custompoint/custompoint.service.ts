import {
    appConstant,
    CommonFileService,
    CustomPointEntity,
} from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class CustomPointService {
    constructor(
        @InjectRepository(CustomPointEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCustomPointRepository: Repository<CustomPointEntity>,
        @Inject('COMMON_SERVICE')
        private readonly commonMicroservice: ClientProxy,
        private readonly commonFileService: CommonFileService,
    ) {}

    async save(data: any) {
        data = Object.values(data);
        const savedResult = this.writeReplicaCustomPointRepository.create(data);
        return await this.writeReplicaCustomPointRepository.save(savedResult);
    }

    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(
            data,
            this.writeReplicaCustomPointRepository.metadata,
        );
        return await this.writeReplicaCustomPointRepository
            .createQueryBuilder('custompoint')
            .update(CustomPointEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
