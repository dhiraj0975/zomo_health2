import { appConstant, CommonArrayService, CommonFileService, ThemeSettingsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateInput } from "../../../input";
@Injectable()
export class ThemeSettingsService {
    constructor(
        @InjectRepository(ThemeSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaThemeSettingsRepository: Repository<ThemeSettingsEntity>,
        @InjectRepository(ThemeSettingsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaThemeSettingsRepository: Repository<ThemeSettingsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
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
                : 'themes.id';
        const queryResult = await this.readReplicaThemeSettingsRepository.createQueryBuilder('themes')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any,field: any[] = []) {
        return await this.readReplicaThemeSettingsRepository.findOne({
            where: condition,
            select: field,
            order: { 'org_id': 'DESC' },
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaThemeSettingsRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaThemeSettingsRepository.create(data);
        return await this.writeReplicaThemeSettingsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaThemeSettingsRepository.metadata);
        return await this.writeReplicaThemeSettingsRepository.createQueryBuilder('themes')
            .update(ThemeSettingsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaThemeSettingsRepository.delete(condition);
    }
}
