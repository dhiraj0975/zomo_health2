import { appConstant, AssignBrokerEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateAssignBrokerInput } from "../../../input";
@Injectable()
export class AssignBrokerService {
    constructor(
        @InjectRepository(AssignBrokerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaAssignBrokerRepository: Repository<AssignBrokerEntity>,
        @InjectRepository(AssignBrokerEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaAssignBrokerRepository: Repository<AssignBrokerEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateAssignBrokerInput) {
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
                : 'assignBroker.id';
        const queryResult = await this.readReplicaAssignBrokerRepository.createQueryBuilder('assignBroker')
        .leftJoinAndMapOne(
            'assignBroker.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = assignBroker.user_id`,
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
        return await this.readReplicaAssignBrokerRepository.createQueryBuilder('assignBroker')
        .leftJoinAndMapOne(
            'assignBroker.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = assignBroker.user_id`,
          )
            .where(condition)
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        return await this.readReplicaAssignBrokerRepository.createQueryBuilder('assignBroker')
        .leftJoinAndMapOne(
            'assignBroker.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = assignBroker.user_id`,
          )
          .where(condition)
          .orderBy('assignBroker.id', 'DESC')
          .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaAssignBrokerRepository.create(data);
        return await this.writeReplicaAssignBrokerRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaAssignBrokerRepository.metadata);
        return await this.writeReplicaAssignBrokerRepository.createQueryBuilder('assignBroker')
            .update(AssignBrokerEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaAssignBrokerRepository.delete(condition);
    }
}