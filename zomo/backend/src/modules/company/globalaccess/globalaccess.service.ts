import { appConstant, CommonFileService, GlobalAccessEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class GlobalAccessService {
    constructor(
        @InjectRepository(GlobalAccessEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaglobalAccessRepository: Repository<GlobalAccessEntity>,
        @InjectRepository(GlobalAccessEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaglobalAccessRepository: Repository<GlobalAccessEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async findOne(condition: any) {
        return await this.readReplicaglobalAccessRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any,field: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaglobalAccessRepository.find({
            where: condition,
            select: field,
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaglobalAccessRepository.create(data);
        return await this.writeReplicaglobalAccessRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaglobalAccessRepository.metadata);
        return await this.writeReplicaglobalAccessRepository.createQueryBuilder('ga')
            .update(GlobalAccessEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
