import { appConstant, CommonArrayService, CommonFileService, GroupsEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { FindOptionsOrder, FindOptionsSelect, FindOptionsWhere, Repository } from 'typeorm';
@Injectable()
export class GroupsService {
    constructor(
        @InjectRepository(GroupsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaGroupsRepository: Repository<GroupsEntity>,
        @InjectRepository(GroupsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaGroupsRepository: Repository<GroupsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithChallengeInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'DESC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'group.created_date';
        let queryResult = await this.readReplicaGroupsRepository.createQueryBuilder('group')
            .leftJoinAndMapMany(
                'group.team',
                tableConstant.CHALLENGE.TBL_CH_TEAMS,
                'team',
                `team.group_id = group.id AND team.status !=2`,
            )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaGroupsRepository.create(data);
        return await this.writeReplicaGroupsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaGroupsRepository.metadata);
        return await this.writeReplicaGroupsRepository.createQueryBuilder('aod')
            .update(GroupsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaGroupsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaGroupsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(
        condition: FindOptionsWhere<GroupsEntity>,
        orderBy: FindOptionsOrder<GroupsEntity> = null,
        fields: FindOptionsSelect<GroupsEntity> = {
            id: true,
            name: true,
            logo: true,
            schedule_id: true,
            org_id: true,
            created_date: true,
            status: true,
        }
    ) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaGroupsRepository.find({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
}
