import { appConstant, CommonArrayService, CommonFileService, DataManagementFilesEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, InsertResult, Repository, UpdateResult } from "typeorm";
import { CreateFilesInput, PaginateWithFileOrganizationInput } from '../input';
@Injectable()
export class FilesService {
    constructor(
        @InjectRepository(DataManagementFilesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicafilesRepository: Repository<DataManagementFilesEntity>,
        @InjectRepository(DataManagementFilesEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicafilesRepository: Repository<DataManagementFilesEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {
    }
    async paginateList(condition: any, paginationParam: PaginateWithFileOrganizationInput) {
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
                : 'files.id';
        const queryResult = await this.readReplicafilesRepository.createQueryBuilder('files')
        .leftJoinAndMapOne(
            'ql.fileorg',
            tableConstant.DATA_MANAGEMENT.TBL_DMT_FILES_ORGANIZATIONS,
            'fileorg',
            `fileorg.file_id = files.id`,
          )
          .leftJoinAndMapOne(
            'ql.broker',
            tableConstant.BROKER,
            'broker',
            `fileorg.organization_id = broker.org_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async brokerPaginateList(condition: any, paginationParam: PaginateWithFileOrganizationInput,fields: any []=['files']) {
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
                : 'files.id';
        const queryResult = await this.readReplicafilesRepository.createQueryBuilder('files')
            .innerJoinAndMapOne(
                'files.fileorg',
                tableConstant.DATA_MANAGEMENT.TBL_DMT_FILES_ORGANIZATIONS,
                'fileorg',
                `fileorg.file_id = files.id`,
            )
            .innerJoinAndMapOne(
                'files.broker',
                tableConstant.BROKER,
                'broker',
                `fileorg.organization_id = broker.org_id AND broker.status = 1`,
            )
            .innerJoinAndMapOne(
                'files.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = fileorg.organization_id AND company.status = 1`,
            )
            .where(condition)
            .select(fields)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: FindOptionsWhere<DataManagementFilesEntity> | FindOptionsWhere<DataManagementFilesEntity>[]) : Promise<DataManagementFilesEntity | null> {
        return await this.readReplicafilesRepository.findOne({
            where: condition,
        });
    }
    async countFile(condition: any) {
        return await this.writeReplicafilesRepository.createQueryBuilder('files')
        .where(condition)
        .getCount();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicafilesRepository.find({
            where: condition,
            select: [],
            order: orderBy,
        });
    }
    async save(data: Partial<CreateFilesInput>): Promise<InsertResult> {
        const savedResult = this.writeReplicafilesRepository.create(data);
        return await this.writeReplicafilesRepository.insert(savedResult);
    }
    async update(condition: string | object, data: Partial<CreateFilesInput>): Promise<UpdateResult> {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicafilesRepository.metadata);
        return await this.writeReplicafilesRepository.createQueryBuilder('files')
            .update(DataManagementFilesEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicafilesRepository.delete(condition);
    }
}