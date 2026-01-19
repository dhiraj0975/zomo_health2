import { appConstant, CommonArrayService, CommonFileService, DeviceConfigurationsEntity } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateWithDeviceConfigurationsInput } from "../../../input";
@Injectable()
export class DeviceConfigurationsService {
    constructor(
        @InjectRepository(DeviceConfigurationsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicadeviceConfigurationRepository: Repository<DeviceConfigurationsEntity>,
        @InjectRepository(DeviceConfigurationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicadeviceConfigurationRepository: Repository<DeviceConfigurationsEntity>,
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
                : 'deviceconfiguration.created';
        const queryResult = await this.readReplicadeviceConfigurationRepository.createQueryBuilder('deviceconfiguration')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicadeviceConfigurationRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicadeviceConfigurationRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicadeviceConfigurationRepository.create(data);
        return await this.writeReplicadeviceConfigurationRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicadeviceConfigurationRepository.metadata);
        return await this.writeReplicadeviceConfigurationRepository.createQueryBuilder('deviceconfiguration')
            .update(DeviceConfigurationsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicadeviceConfigurationRepository.delete(condition);
    }
}