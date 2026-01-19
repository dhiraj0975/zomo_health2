import { appConstant, BiometricEntity, CommonArrayService, CommonFileService } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginateInput } from "../../../input";
@Injectable()
export class BiometricService {
    constructor(
        @InjectRepository(BiometricEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaBirBiometricRepository: Repository<BiometricEntity>,
        @InjectRepository(BiometricEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaBirBiometricRepository: Repository<BiometricEntity>,
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
                : 'biometric.id';
        const queryResult = await this.readReplicaBirBiometricRepository.createQueryBuilder('biometric')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaBirBiometricRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'ASC' };
        }
        return await this.readReplicaBirBiometricRepository.find({
            where: condition,
            select: ['id', 'biometric'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaBirBiometricRepository.create(data);
        return await this.writeReplicaBirBiometricRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaBirBiometricRepository.metadata);
        return await this.writeReplicaBirBiometricRepository.createQueryBuilder('biometric')
            .update(BiometricEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaBirBiometricRepository.delete(condition);
    }
}