import { appConstant, CommonArrayService, CommonFileService, DownloadFormsEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithCompanyInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class DownloadFormsService {
    constructor(
        @InjectRepository(DownloadFormsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaDownloadFormsRepository: Repository<DownloadFormsEntity>,
        @InjectRepository(DownloadFormsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaDownloadFormsRepository: Repository<DownloadFormsEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) { }
    async save(data: any) {
        const savedResult = this.writeReplicaDownloadFormsRepository.create(data);
        return await this.writeReplicaDownloadFormsRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaDownloadFormsRepository.metadata);
        return await this.writeReplicaDownloadFormsRepository.createQueryBuilder('a')
            .update(DownloadFormsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaDownloadFormsRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDownloadFormsRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async countdownloadforms(condition: any, field: any[] = [], orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaDownloadFormsRepository.createQueryBuilder('downloadforms')
            .where(condition)
            .select(field)
            .orderBy(`downloadforms.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getCount();
    }
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
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
                : 'downloadforms.id';
        const queryResult = await this.readReplicaDownloadFormsRepository.createQueryBuilder('downloadforms')
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
}
