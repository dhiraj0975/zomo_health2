import { appConstant, CommonArrayService, CommonFileService, QuickLinkEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from "../../../input";
import {UrlManageService} from "@/modules/common";
@Injectable()
export class QuickLinkService {
    constructor(
        @InjectRepository(QuickLinkEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuickLinkRepository: Repository<QuickLinkEntity>,
        @InjectRepository(QuickLinkEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkRepository: Repository<QuickLinkEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly activityLogService: ActivityLogService,
        private readonly urlManageService: UrlManageService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithCompanyInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order =
            paginationParam && paginationParam.order
                ? paginationParam.order
                : 'ASC';
        const orderBy =
            paginationParam && paginationParam.order_by
                ? paginationParam.order_by
                : 'ql.id';
        let query = await this.readReplicaQuickLinkRepository.createQueryBuilder('ql')
        .leftJoinAndMapOne(
            'ql.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = ql.c_companies_id AND company.status = 1`,
          )
          .leftJoinAndMapMany(
            'ql.orglist',
            tableConstant.QUICK_LINK.TBL_QUICK_LINK_ORGLISTS,
            'orglist',
            `orglist.quicklink_id = ql.id AND orglist.status = 1`,
          )
        .where(condition);
        let queryResult = await query
        .orderBy(orderBy, <any>order)
        .take(paginateObj.take)
        .skip(paginateObj.skip)
        .getManyAndCount();
        let [result, total] = queryResult;
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async save(data: any) {
    if (data.sort_order == null) {
        const order = await this.writeReplicaQuickLinkRepository.createQueryBuilder('ql')
            .select('COALESCE(MAX(ql.sort_order), 0) + 1', 'next')
            .where('ql.c_companies_id = :companyId', { companyId: data.c_companies_id })
            .andWhere('ql.status = :active', { active: 1 })
            .getRawOne<{ next: string }>();
        data.sort_order = Number(order?.next ?? 1);
    }
    const entity = this.writeReplicaQuickLinkRepository.create(data);
    return this.writeReplicaQuickLinkRepository.save(entity);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaQuickLinkRepository.metadata);
        return await this.writeReplicaQuickLinkRepository.createQueryBuilder('ql')
            .update(QuickLinkEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaQuickLinkRepository.delete(condition);
    }
    async findOne(condition: any, options?: { loadOrglist?: boolean }) {
        const query = this.readReplicaQuickLinkRepository
            .createQueryBuilder('ql')
            .leftJoinAndMapOne(
                'ql.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = ql.c_companies_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'ql.folder',
                tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS,
                'folder',
                `folder.id = ql.folder_id`,
            );
        if (options?.loadOrglist) {
            query
            .leftJoinAndMapMany(
                'ql.orglist',
                tableConstant.QUICK_LINK.TBL_QUICK_LINK_ORGLISTS,
                'orglist',
                `orglist.quicklink_id = ql.id AND orglist.status = 1`,
            )
            .leftJoinAndMapOne(
                'orglist.org',
                tableConstant.COMPANIES.TBL_COMPANY,
                'org',
                `org.id = orglist.c_companies_id AND org.status = 1`,
            );
        }
        query.where(condition);
        return await query.getOne();
    }
    async listRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkRepository.createQueryBuilder('ql')
        .leftJoinAndMapMany(
            'ql.orglist',
            tableConstant.QUICK_LINK.TBL_QUICK_LINK_ORGLISTS,
            'orglist',
            `orglist.quicklink_id = ql.id AND orglist.status = 1`,
          )
        .leftJoinAndMapOne(
            'ql.folder',
            tableConstant.QUICK_LINK.TBL_QUICK_LINK_FOLDERS,
            'folder',
            `folder.id = ql.folder_id`,
          )          
        .where(condition)
        .select(fields)
        .orderBy(`ql.c_companies_id`, 'DESC')
        .orderBy(`ql.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async updateOrder(data: any, req: Request) {
        let i = 0;
        const quicklinkData = await this.readReplicaQuickLinkRepository.find({
            select: ["id","c_companies_id"],
            where: { c_companies_id: data.c_companies_id },
        });
        if(quicklinkData.map((e)=>e.id).filter(element => data.order.includes(element))){
            for(let id of data.order) {
                await this.writeReplicaQuickLinkRepository.createQueryBuilder('ql')
                    .update(QuickLinkEntity)
                    .set({sort_order: ++i})
                    .where({id})
                    .execute();
                this.activityLogService.create({id: id, sort_order: 0 }, {sort_order: i}, tableConstant.QUICK_LINK.TBL_QUICK_LINK, req.tokenUser?.id);
            }
        }
    }
    async quickLinkListRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { sort_order: 'ASC' };
        }
        return await this.readReplicaQuickLinkRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async quickLinkFindOne(fields: any,condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkRepository.findOne({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async replacePreventionCloudLinks(html: string): Promise<string> {
        if (!html) return html;

        const preventionCloudLinks = [
            ...html.matchAll(/src="\s*(https:\/\/[^"]*preventioncloud[^"]*)"/g)
        ].map(match => match[1]);

        for (const originalUrl of preventionCloudLinks) {
            const data = await this.urlManageService.onmapUrl(originalUrl);
            if (data && typeof data === 'string') {
                const escapedOriginalUrl = originalUrl.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`src\\s*=\\s*"\\s*${escapedOriginalUrl}"`, 'g');
                html = html.replace(regex, `src="${data}"`);
            }
        }

        return html;
    }
}
