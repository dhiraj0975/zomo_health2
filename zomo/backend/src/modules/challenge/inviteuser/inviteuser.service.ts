import { appConstant, CommonFileService, InviteUserEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class InviteUserService {
    constructor(
        @InjectRepository(InviteUserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaInviteUserRepository: Repository<InviteUserEntity>,
        @InjectRepository(InviteUserEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaInviteUserRepository: Repository<InviteUserEntity>,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaInviteUserRepository.create(data);
        return await this.writeReplicaInviteUserRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaInviteUserRepository.metadata);
        return await this.writeReplicaInviteUserRepository.createQueryBuilder('iu')
            .update(InviteUserEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaInviteUserRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaInviteUserRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { created_date: 'DESC' };
        }
        return await this.readReplicaInviteUserRepository.createQueryBuilder('invitedUser')
        .leftJoinAndMapOne(
            'invitedUser.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = invitedUser.user_id AND user.status = 1`,
        )
            .where(condition)
            .select(['invitedUser.*', 'CONCAT(COALESCE(user.first_name, ""), " ", COALESCE(user.last_name, "")) AS name','profile_image'])
            .orderBy(`invitedUser.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
    }
    async list(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { created_date: 'DESC' };
        }
        return await this.readReplicaInviteUserRepository.createQueryBuilder('invitedUser')
            .where(condition)
            .orderBy(`invitedUser.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
}
