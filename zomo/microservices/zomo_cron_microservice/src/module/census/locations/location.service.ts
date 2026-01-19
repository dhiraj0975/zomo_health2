import { appConstant, CommonArrayService, LocationsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class LocationService {
    constructor(
        @InjectRepository(
            LocationsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaLocationsRepository: Repository<LocationsEntity>,
        @InjectRepository(LocationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaLocationsRepository: Repository<LocationsEntity>,
        private readonly commonArrayService: CommonArrayService,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicaLocationsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaLocationsRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaLocationsRepository.create(data);
        return await this.writeReplicaLocationsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaLocationsRepository
            .createQueryBuilder('location')
            .update(LocationsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async filterData(condition: any) {
        return await this.readReplicaLocationsRepository
            .createQueryBuilder('location')
            .where(condition)
            .getMany();
    }
    
}
