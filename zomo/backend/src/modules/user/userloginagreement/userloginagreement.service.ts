import { appConstant, CommonArrayService, CommonFileService, tableConstant, UserLoginAgreementEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from '../../../input';
@Injectable()
export class UserLoginAgreementService {
    constructor(
        @InjectRepository(UserLoginAgreementEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserLoginAgreementRepository: Repository<UserLoginAgreementEntity>,
        @InjectRepository(UserLoginAgreementEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserLoginAgreementRepository: Repository<UserLoginAgreementEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(
        condition: any,
        paginationParam: PaginateWithCompanyInput,
    ) {
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
                : 'userLoginAgreement.created';
        const queryResult =
            await this.readReplicaUserLoginAgreementRepository.createQueryBuilder(
                'userLoginAgreement',
            )
                .leftJoinAndMapOne(
                    'userLoginAgreement.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = userLoginAgreement.user_id`,
                )
                .leftJoinAndMapOne(
                    'userLoginAgreement.company',
                    tableConstant.COMPANIES.TBL_COMPANY,
                    'company',
                    `company.id = userLoginAgreement.org_id AND company.status = 1`,
                )
                .leftJoinAndMapOne(
                    'userLoginAgreement.company_meta',
                    tableConstant.COMPANIES.TBL_COMPANY_META,
                    'company_meta',
                    `company_meta.org_id = userLoginAgreement.org_id`,
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
        const savedResult = this.writeReplicaUserLoginAgreementRepository.create(data);
        return await this.writeReplicaUserLoginAgreementRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaUserLoginAgreementRepository.delete(condition);
    }
    async findOne(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserLoginAgreementRepository.createQueryBuilder('userLoginAgreement')
        .leftJoinAndMapOne(
            'userLoginAgreement.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = userLoginAgreement.user_id`,
        )
        .leftJoinAndMapOne(
            'userLoginAgreement.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = userLoginAgreement.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
            'userLoginAgreement.company_settings',
            tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
            'company_settings',
            `company_settings.org_id = userLoginAgreement.org_id`,
        )
        .where(condition)
        .orderBy('user.id', 'DESC')
        .getOne();
    }
    async listRecord(condition: any, orderBy = null) {
        return await this.readReplicaUserLoginAgreementRepository.createQueryBuilder('userLoginAgreement')
        .leftJoinAndMapOne(
            'userLoginAgreement.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = userLoginAgreement.user_id`,
        )
        .leftJoinAndMapOne(
            'userLoginAgreement.company',
            tableConstant.COMPANIES.TBL_COMPANY,
            'company',
            `company.id = userLoginAgreement.org_id AND company.status = 1`,
        )
        .leftJoinAndMapOne(
            'company.company_settings',
            tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
            'company_settings',
            `company_settings.org_id = userLoginAgreement.org_id`,
        )
        .where(condition)
        .orderBy('user.id', 'DESC')
        .getMany();
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUserLoginAgreementRepository.metadata);
        return await this.writeReplicaUserLoginAgreementRepository.createQueryBuilder('userLoginAgreement')
            .update(UserLoginAgreementEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async findOneUser(condition: any, select: any = []) {
        return await this.readReplicaUserLoginAgreementRepository.findOne({
            where: condition,
            select: select,
        });
    }
}
