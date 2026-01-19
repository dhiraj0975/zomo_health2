import { appConstant, CommonArrayService, CommonFileService, QuickLinkFoldersEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
@Injectable()
export class QuickLinkFoldersService {
    constructor(
        @InjectRepository(QuickLinkFoldersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkFoldersRepository: Repository<QuickLinkFoldersEntity>,
        @InjectRepository(QuickLinkFoldersEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkFoldersRepository: Repository<QuickLinkFoldersEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
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
                ? `folders.${paginationParam.order_by}`
                : 'folders.created';
        var queryResult = await this.readReplicaQuickLinkFoldersRepository.createQueryBuilder('folders')
        .leftJoinAndMapOne(
            'folders.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = folders.c_companies_id AND company.status = 1`,
          )
          .leftJoinAndMapMany(
            'folders.orglist',
            tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS_ORGLISTS,
            'orglist',
            `orglist.folder_id = folders.id AND orglist.status = 1`,
          )
          .leftJoinAndMapOne(
            'orglist.org',
            tableConstant.COMPANIES.TBL_COMPANY,
            'org',
            `org.id = orglist.c_companies_id AND org.status = 1`,
          )
          .leftJoinAndMapMany(
            'folders.Quicklink',
            tableConstant.QUICK_LINK.TBL_QUICK_LINK,
            'Quicklink',
            `Quicklink.folder_id = folders.id AND Quicklink.status = 1`,
          )
            .where(condition)
            .orderBy(orderBy, <any>order)
            .take(paginateObj.take)
            .skip(paginateObj.skip)
            .getManyAndCount();
        const [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
        const savedResult = this.writeReplicaQuickLinkFoldersRepository.create(data);
        return await this.writeReplicaQuickLinkFoldersRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuickLinkFoldersRepository.metadata);
        return await this.writeReplicaQuickLinkFoldersRepository.createQueryBuilder('folders')
            .update(QuickLinkFoldersEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuickLinkFoldersRepository.delete(condition);
    }
    async findOneWithoutJoin(condition: any) {
        return await this.readReplicaQuickLinkFoldersRepository.findOne({
            where: condition
        });
    }
    async findOne(condition: any) {
        return await this.readReplicaQuickLinkFoldersRepository.createQueryBuilder('folders')
        .leftJoinAndMapOne(
            'folders.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = folders.c_companies_id AND company.status = 1`,
          )
          .leftJoinAndMapMany(
            'folders.orglist',
            tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS_ORGLISTS,
            'orglist',
            `orglist.folder_id = folders.id AND orglist.status = 1`,
          )
          .leftJoinAndMapOne(
            'orglist.org',
            tableConstant.COMPANIES.TBL_COMPANY,
            'org',
            `org.id = orglist.c_companies_id AND org.status = 1`,
          )
            .where(condition)
            .getOne();
    }
   
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkFoldersRepository.createQueryBuilder('folder')
        .leftJoinAndMapMany(
            'folder.orglist',
            tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS_ORGLISTS,
            'orglist',
            `orglist.folder_id = folder.id AND orglist.status = 1`,
          )
        .where(condition)
        .orderBy(orderBy)
        .getMany();
    }
}
