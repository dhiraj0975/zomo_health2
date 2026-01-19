import { appConstant, CommonArrayService, CommonFileService, DataManagementFilesOrganizationsEntity, tableConstant } from '@common-constants';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, InsertResult, Repository, UpdateResult } from "typeorm";
import { CreateFileOrganizationsInput, PaginateWithFileOrganizationInput } from '../input';
@Injectable()
export class FileOrganizationService {
    constructor(
        @InjectRepository(DataManagementFilesOrganizationsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicafilesOrganizationRepository: Repository<DataManagementFilesOrganizationsEntity>,
        @InjectRepository(DataManagementFilesOrganizationsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicafilesOrganizationRepository: Repository<DataManagementFilesOrganizationsEntity>,
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
                : 'fileOrganization.id';
        const queryResult = await this.readReplicafilesOrganizationRepository.createQueryBuilder('fileOrganization')
        .leftJoinAndMapOne(
            'fileOrganization.file',
            tableConstant.TBL_LANGUAGES,
            'file',
            `file.id = fileOrganization.file_id`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async findOne(condition: FindOptionsWhere<DataManagementFilesOrganizationsEntity> | FindOptionsWhere<DataManagementFilesOrganizationsEntity>[]) : Promise<DataManagementFilesOrganizationsEntity | null> {
        return await this.readReplicafilesOrganizationRepository.findOne({
            where: condition,
        });
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicafilesOrganizationRepository.find({
            where: condition,
            select: ['id', 'file_id', 'organization_id'],
            order: orderBy,
        });
    }
    async save(data: Partial<CreateFileOrganizationsInput>): Promise<InsertResult> {
        const savedResult = this.writeReplicafilesOrganizationRepository.create(data);
        return await this.writeReplicafilesOrganizationRepository.insert(savedResult);
    }
    async update(condition: string | object, data: Partial<CreateFileOrganizationsInput>): Promise<UpdateResult> {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicafilesOrganizationRepository.metadata);
        return await this.writeReplicafilesOrganizationRepository.createQueryBuilder('fileOrganization')
            .update(DataManagementFilesOrganizationsEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicafilesOrganizationRepository.delete(condition);
    }
}