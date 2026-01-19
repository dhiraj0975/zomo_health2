import { appConstant, CommonArrayService, CommonFileService, tableConstant, UserLoginEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithCompanyInput } from '../../../input';
@Injectable()
export class UserLoginService {
    constructor(
        @InjectRepository(UserLoginEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserLoginRepository: Repository<UserLoginEntity>,
        @InjectRepository(UserLoginEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserLoginRepository: Repository<UserLoginEntity>,
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
                : 'userLogin.created';
        const queryResult =
            await this.readReplicaUserLoginRepository.createQueryBuilder(
                'userLogin',
            )
                .leftJoinAndMapOne(
                    'userLogin.user',
                    tableConstant.TBL_USERS,
                    'user',
                    `user.id = userLogin.user_id`,
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
        const savedResult = this.writeReplicaUserLoginRepository.create(data);
        return await this.writeReplicaUserLoginRepository.save(savedResult);
    }
    async delete(condition: any) {
        await this.writeReplicaUserLoginRepository.delete(condition);
    }
    async findOne(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaUserLoginRepository.createQueryBuilder('userLogin')
        .leftJoinAndMapOne(
            'userLogin.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = userLogin.user_id`,
        )
        .where(condition)
        .orderBy('user.id', 'DESC')
        .getOne();
    }
    async findUserReportData(condition: any, orderBy = null, fields: any = ['userLogin.*'],conditionn:any,report:string = '') {
        const queryBuilder = this.readReplicaUserLoginRepository.createQueryBuilder('userLogin');
        queryBuilder.innerJoin(
            qb =>
                qb
                    .subQuery()
                    .select('user_id', 'user_id')
                    .addSelect('id', 'id')
                    .addSelect('source', 'source')
                    .addSelect('timezone', 'timezone')
                    .addSelect('MAX(login_time)', 'LastLoginTime')
                    .addSelect(
                        fields.includes('FirstLogin')
                            ? 'MIN(login_time)'
                            : 'NULL',
                        'FirstLogin'
                    )
                    .addSelect(
                        fields.includes('LastLogin')
                            ? 'MAX(login_time)'
                            : 'NULL',
                        'LastLogin'
                    )
                    .addSelect(
                        fields.includes('Android')
                            ? "SUM(CASE WHEN source = '1' THEN 1 ELSE 0 END)"
                            : 'NULL',
                        'Android'
                    )
                    .addSelect(
                        fields.includes('IOS')
                            ? "SUM(CASE WHEN source = '2' THEN 1 ELSE 0 END)"
                            : 'NULL',
                        'IOS'
                    )
                    .from('s_user_login', 'source_counts')
                    .where(conditionn) 
                    .groupBy(`${report == 'app_login' ? 'user_id, source' : 'user_id'}`),

            'source_counts',
            `userLogin.user_id = source_counts.user_id AND userLogin.login_time = source_counts.LastLoginTime`
        );
        queryBuilder.select([
            'userLogin.id AS userLogin_id',
            'userLogin.user_id AS userLogin_user_id',
            'userLogin.ip AS userLogin_ip',
            'userLogin.login_time AS LastLogin',
            'userLogin.timezone AS userLogin_timezone',
            'userLogin.useragent AS userLogin_useragent',
        ]);
        if (fields.includes('FirstLogin')) {
            queryBuilder.addSelect('source_counts.FirstLogin', 'FirstLogin');
        }
        if (fields.includes('LastLogin')) {
            queryBuilder.addSelect('source_counts.LastLogin', 'LastLogin');
        }
        if (fields.includes('Android')) {
            queryBuilder.addSelect('source_counts.Android', 'Android');
        }
        if (fields.includes('IOS')) {
            queryBuilder.addSelect('source_counts.IOS', 'IOS');
        }
        queryBuilder.where(condition);
        if(orderBy !== null){
            queryBuilder.orderBy('userLogin.login_time', 'DESC');
        }else{
            queryBuilder.orderBy('userLogin.id', 'DESC');
        }
        return queryBuilder.getRawMany();
    }
    async listRecord(condition: any, orderBy = null, fields: any = ['userLogin.*']) {
        if (!orderBy) {
            orderBy = { 'userLogin.id': 'DESC' };
        }
        return await this.readReplicaUserLoginRepository.createQueryBuilder('userLogin')
        .leftJoinAndMapOne(
            'userLogin.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = userLogin.user_id`,
        )
        .where(condition)
        .select(fields)
        .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async userLoginlistRecord(condition: any, orderBy = null, fields: any = []) {
        if (!orderBy) {
            orderBy = { 'userLogin.id': 'DESC' };
        }
        return await this.readReplicaUserLoginRepository.createQueryBuilder('userLogin')
            .where(condition)
            .select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getRawMany();
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaUserLoginRepository.metadata);
        return await this.writeReplicaUserLoginRepository.createQueryBuilder('userLogin')
            .update(UserLoginEntity)
            .set(data)
            .where(condition)
            .execute();
    }
}
