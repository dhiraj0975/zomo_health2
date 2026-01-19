import { appConstant, BiometricOrgSettingEntity, CommonArrayService, CommonFileService, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateInput } from "../../../input";
@Injectable()
export class BiometricOrgSettingService {
    constructor(
        @InjectRepository(BiometricOrgSettingEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBiometricOrgRepository: Repository<BiometricOrgSettingEntity>,
        @InjectRepository(BiometricOrgSettingEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBiometricOrgRepository: Repository<BiometricOrgSettingEntity>,
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
                : 'biometricOrg.id';
        const queryResult = await this.readReplicaBiometricOrgRepository.createQueryBuilder('biometricOrg')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaBiometricOrgRepository.createQueryBuilder('biometricOrgSetting')
            .leftJoinAndMapMany(
                'biometricOrgSetting.biometricOrg',
                tableConstant.BIOMETRIC.BIR_ORG_BIOMETRIC,
                'biometricOrg',
                `biometricOrg.company_id = biometricOrgSetting.org_id AND biometricOrg.status = 1`,
            )
            .leftJoinAndMapOne(
                'biometricOrg.biometrics',
                tableConstant.BIOMETRIC.BIR_BIOMETRIC,
                'biometrics',
                `biometrics.id = biometricOrg.biometric AND biometrics.status = 1`,
            )
            .leftJoinAndMapOne(
                'biometricOrg.biometricOption',
                tableConstant.BIOMETRIC.BIR_BIOMETRIC,
                'biometricOption',
                `biometricOption.id = biometricOrg.is_optional AND biometricOption.status = 1`,
            )
            .where(condition)
            .getOne()
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaBiometricOrgRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaBiometricOrgRepository.create(data);
        return await this.writeReplicaBiometricOrgRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaBiometricOrgRepository.metadata);
        return await this.writeReplicaBiometricOrgRepository.createQueryBuilder('biometric')
            .update(BiometricOrgSettingEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaBiometricOrgRepository.delete(condition);
    }
}