import {
    appConstant,
    AuthorizationsEntity,
    BaseService,
    CommonArrayService,
    CommonFileService,
    tableConstant
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class AuthorizationsService extends BaseService<AuthorizationsEntity> {
    constructor(
        @InjectRepository(AuthorizationsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAuthorizationsRepository: Repository<AuthorizationsEntity>,
        @InjectRepository(AuthorizationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAuthorizationsRepository: Repository<AuthorizationsEntity>,
        private readonly commonFileService: CommonFileService,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaAuthorizationsRepository,writeReplicaAuthorizationsRepository,'authorizations',commonArrayService);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAuthorizationsRepository.create(data);
        return await this.writeReplicaAuthorizationsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAuthorizationsRepository.metadata)
        return await this.writeReplicaAuthorizationsRepository.createQueryBuilder('a')
            .update(AuthorizationsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaAuthorizationsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaAuthorizationsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, fields: any, orderBy: any = null,tableData: any = null) {
        if (!orderBy) {
            orderBy = { 'a.id': 'DESC' };
        }
        let queryResult: any = this.readReplicaAuthorizationsRepository.createQueryBuilder('a')
        if (tableData == null) {
            queryResult = queryResult.leftJoinAndMapOne(
                'a.activity',
                tableConstant.ACTIVITIES.TBL_ACTIVITIES,
                'activity',
                `activity.id = a.activity_id`
            )
        }
        queryResult = queryResult.where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
        return await queryResult;
    }
    async authorizationListRecord(condition: any, fields: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { 'a.id': 'DESC' };
        }
        let queryResult: any = await this.readReplicaAuthorizationsRepository.createQueryBuilder('a')
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
        return queryResult;
    }
}
