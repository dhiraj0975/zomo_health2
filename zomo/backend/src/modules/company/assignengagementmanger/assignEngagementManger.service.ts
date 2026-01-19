import { appConstant, AssignEngagementManagerEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateAssignEngagementManagerInput } from "../../../input";
@Injectable()
export class AssignEngagementMangerService {
    constructor(
        @InjectRepository(AssignEngagementManagerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssignBrokerRepository: Repository<AssignEngagementManagerEntity>,
        @InjectRepository(AssignEngagementManagerEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssignBrokerRepository: Repository<AssignEngagementManagerEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateAssignEngagementManagerInput) {
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
                : 'engManager.id';
        const queryResult = await this.readReplicaAssignBrokerRepository.createQueryBuilder('engManager')
        .leftJoinAndMapOne(
            'engManager.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = engManager.user_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaAssignBrokerRepository.createQueryBuilder('engManager')
        .leftJoinAndMapOne(
            'engManager.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = engManager.user_id`,
          )
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaAssignBrokerRepository.createQueryBuilder('engManager')
        .leftJoinAndMapOne(
            'engManager.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = engManager.user_id`,
          )
          .where(condition)
          .orderBy(`engManager.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
          .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssignBrokerRepository.create(data);
        return await this.writeReplicaAssignBrokerRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssignBrokerRepository.metadata);
        return await this.writeReplicaAssignBrokerRepository.createQueryBuilder('engManager')
            .update(AssignEngagementManagerEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssignBrokerRepository.delete(condition);
    }
}