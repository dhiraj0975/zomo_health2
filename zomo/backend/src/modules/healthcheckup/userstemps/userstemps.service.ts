import { appConstant, CommonFileService, UsersTempsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class UsersTempsService {
    constructor(
        @InjectRepository(UsersTempsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUsersTempsRepository: Repository<UsersTempsEntity>,
        @InjectRepository(UsersTempsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUsersTempsRepository: Repository<UsersTempsEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaUsersTempsRepository.create(data);
        return await this.writeReplicaUsersTempsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUsersTempsRepository.metadata);
        return await this.writeReplicaUsersTempsRepository.createQueryBuilder('userstemps')
            .update(UsersTempsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaUsersTempsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUsersTempsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
}
