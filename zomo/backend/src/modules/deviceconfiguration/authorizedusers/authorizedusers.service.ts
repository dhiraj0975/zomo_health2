import { appConstant, AuthorizedUsersEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithDeviceConfigurationsInput } from "../../../input";
@Injectable()
export class AuthorizedUsersService {
    constructor(
        @InjectRepository(AuthorizedUsersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaauthorizedUsersRepository: Repository<AuthorizedUsersEntity>,
        @InjectRepository(AuthorizedUsersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaauthorizedUsersRepository: Repository<AuthorizedUsersEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithDeviceConfigurationsInput) {
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
                : 'deviceconfiguration.id';
        const queryResult = await this.readReplicaauthorizedUsersRepository.createQueryBuilder('deviceconfiguration')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaauthorizedUsersRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaauthorizedUsersRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaauthorizedUsersRepository.create(data);
        return await this.writeReplicaauthorizedUsersRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaauthorizedUsersRepository.metadata);
        return await this.writeReplicaauthorizedUsersRepository.createQueryBuilder('deviceconfiguration')
            .update(AuthorizedUsersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaauthorizedUsersRepository.delete(condition);
    }
}