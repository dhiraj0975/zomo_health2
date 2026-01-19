import { appConstant, CommonArrayService, CommonFileService, OrgBiometricEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateInput } from "../../../input";
@Injectable()
export class OrgBiometricService {
    constructor(
        @InjectRepository(OrgBiometricEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaOrgBiometricRepository: Repository<OrgBiometricEntity>,
        @InjectRepository(OrgBiometricEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaOrgBiometricRepository: Repository<OrgBiometricEntity>,
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
                : 'orgBiometric.id';
        const queryResult = await this.readReplicaOrgBiometricRepository.createQueryBuilder('orgBiometric')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaOrgBiometricRepository.createQueryBuilder('orgBiometric')
        .where(condition)
        .orderBy(`orgBiometric.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null, fields: string[] = ['orgBiometric','biometricsList']) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaOrgBiometricRepository.createQueryBuilder('orgBiometric')
        .leftJoinAndMapOne(
            'orgBiometric.biometricsList',
            tableConstant.BIOMETRIC.BIR_BIOMETRIC,
            'biometricsList',
            `biometricsList.id = orgBiometric.biometric AND biometricsList.status = 1`,
        )
        .select(fields)
        .where(condition)
        .orderBy(`orgBiometric.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async save(data: any) {
        const savedResult = this.writeReplicaOrgBiometricRepository.create(data);
        return await this.writeReplicaOrgBiometricRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaOrgBiometricRepository.metadata);
        return await this.writeReplicaOrgBiometricRepository.createQueryBuilder('biometric')
            .update(OrgBiometricEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaOrgBiometricRepository.delete(condition);
    }
}