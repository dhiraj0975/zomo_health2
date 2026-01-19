import { appConstant, CommonArrayService, CommonFileService, ThemesEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateInput } from "../../../input";
@Injectable()
export class CoreThemesService {
    constructor(
        @InjectRepository(ThemesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCoreThemesRepository: Repository<ThemesEntity>,
        @InjectRepository(ThemesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaCoreThemesRepository: Repository<ThemesEntity>,
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
        const queryResult = await this.readReplicaCoreThemesRepository.createQueryBuilder('themes')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: any) {
        return await this.readReplicaCoreThemesRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCoreThemesRepository.find({
            where: condition,
            select: ['id', 'themename'],
            order: orderBy,
        });
    }
    async save(data: any) {
        const savedResult = this.writeReplicaCoreThemesRepository.create(data);
        return await this.writeReplicaCoreThemesRepository.insert(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaCoreThemesRepository.metadata);
        return await this.writeReplicaCoreThemesRepository.createQueryBuilder('themes')
            .update(ThemesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
