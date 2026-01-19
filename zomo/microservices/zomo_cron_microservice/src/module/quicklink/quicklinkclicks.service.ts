import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonDateService,
    CommonFileService,
    CommonHealthService,
    CommonService,
    QuickLinkClicksEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class QuickLinkClicksService extends BaseService<QuickLinkClicksEntity> {
    constructor(
        @InjectRepository(
            QuickLinkClicksEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaQuickLinkClicksRepository: Repository<QuickLinkClicksEntity>,
        @InjectRepository(QuickLinkClicksEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaQuickLinkClicksRepository: Repository<QuickLinkClicksEntity>,
        private readonly commonService: CommonService,
        commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        private readonly commonHealthService: CommonHealthService,
    ) {
        super(
            readReplicaQuickLinkClicksRepository,
            writeReplicaQuickLinkClicksRepository,
            'quickLinkClicks',
            commonArrayService,
        );
    }
    async save(data: any) {
        const savedResult =
            this.writeReplicaQuickLinkClicksRepository.create(data);
        return await this.writeReplicaQuickLinkClicksRepository.save(
            savedResult,
        );
    }
    async update(condition: any, data: any) {
        return await this.writeReplicaQuickLinkClicksRepository
            .createQueryBuilder('clicks')
            .update(QuickLinkClicksEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any) {
        await this.writeReplicaQuickLinkClicksRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaQuickLinkClicksRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async listRecord(
        fields: any = ['clicks.*'],
        condition: any,
        orderBy: any = null,
    ) {
        if (!orderBy) {
            orderBy = { 'clicks.id': 'DESC' };
        }
        return await this.readReplicaQuickLinkClicksRepository
            .createQueryBuilder('clicks')
            .where(condition)
            .select(fields)
            .orderBy(
                `${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
    }
    async quicklinkReport(fields: any = ['quicklinkClick.*'], condition: any,paginationParam: any = null, orderBy: object = null, addOrderBy: object = null) {
        try {
            if (!orderBy) {
                orderBy = { 'User.id': 'DESC' };
            }
            if (!addOrderBy) {
                addOrderBy = { 'quicklinkClick.id': 'ASC' };
            }
            let paginateObj
            if (paginationParam !== null) {
                paginateObj = this.commonArrayService.getPaginationVar(
                    paginationParam.page || 1,
                    paginationParam.limit,
                );
            }
            let data = this.readReplicaQuickLinkClicksRepository.createQueryBuilder('quicklinkClick')
            .innerJoinAndMapOne(
                'quicklinkClick.User',
                tableConstant.TBL_USERS,
                'User',
                `User.id = quicklinkClick.user_id`,
            )
            .innerJoinAndMapOne(
                'quicklinkClick.quicklink',
                tableConstant.REPORT.TBL_QUICK_LINK,
                'quicklink',
                `quicklink.id = quicklinkClick.quicklink_id`,
            )
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .addOrderBy(`${Object.keys(addOrderBy)[0]}`, addOrderBy[Object.keys(addOrderBy)[0]]);
            let resultData
            if (paginationParam === null) {
                resultData = await data.getMany();
            }
            else{
                let finalData= await data.take(paginateObj.take).skip(paginateObj.skip).getManyAndCount();
                const [result, total] = finalData;
                resultData = this.commonArrayService.paginationResponse(
                    result,
                    total,
                    paginateObj,
                );
            }
            return resultData;
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
