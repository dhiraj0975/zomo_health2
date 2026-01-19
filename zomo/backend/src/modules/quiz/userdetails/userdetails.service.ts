import {appConstant, BaseService, CommonArrayService, CommonFileService, UserDetailsEntity} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class UserDetailsService extends BaseService<UserDetailsEntity> {
    constructor(
        @InjectRepository(UserDetailsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserDetailsRepository: Repository<UserDetailsEntity>,
        @InjectRepository(UserDetailsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserDetailsRepository: Repository<UserDetailsEntity>,
        private readonly commonFileService: CommonFileService,
        commonArrayService: CommonArrayService,
    ) {
        super(readReplicaUserDetailsRepository,writeReplicaUserDetailsRepository,'userDetail',commonArrayService);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaUserDetailsRepository.create(data);
        return await this.writeReplicaUserDetailsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUserDetailsRepository.metadata);
        return await this.writeReplicaUserDetailsRepository.createQueryBuilder('ud')
            .update(UserDetailsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaUserDetailsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserDetailsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(fields: any[],condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { 'ud.id': 'DESC' };
        }
        return await this.readReplicaUserDetailsRepository.createQueryBuilder('ud')
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
    }
}
