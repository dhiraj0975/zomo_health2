import { appConstant, CommonArrayService, CommonFileService, InstallPluginsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateInput } from "../../../input";
@Injectable()
export class InstallPluginsService {
    constructor(
        @InjectRepository(InstallPluginsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaInstallPluginsRepository: Repository<InstallPluginsEntity>,
        @InjectRepository(InstallPluginsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaInstallPluginsRepository: Repository<InstallPluginsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateInput) {
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
                : 'plugin.id';
        const queryResult = await this.readReplicaInstallPluginsRepository.createQueryBuilder('plugin')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaInstallPluginsRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaInstallPluginsRepository.createQueryBuilder('plugin')
        .where(condition)
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaInstallPluginsRepository.create(data);
        return await this.writeReplicaInstallPluginsRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaInstallPluginsRepository.metadata);
        return await this.writeReplicaInstallPluginsRepository.createQueryBuilder('plugin')
            .update(InstallPluginsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaInstallPluginsRepository.delete(condition);
    }
}