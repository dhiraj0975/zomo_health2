import { appConstant, CommonArrayService, CommonFileService, tableConstant, TokensEntity } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithCommentInput } from 'src/input';
import { Repository } from 'typeorm';
const moment = require('moment-timezone');
const S3_URL =  process.env.S3_URL_PROD;
@Injectable()
export class TokensService {
    constructor(
        @InjectRepository(TokensEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaTokensRepository: Repository<TokensEntity>,
        @InjectRepository(TokensEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaTokensRepository: Repository<TokensEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async save(data: any) {
        const savedResult = this.writeReplicaTokensRepository.create(data);
        return await this.writeReplicaTokensRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaTokensRepository.metadata);
        return await this.writeReplicaTokensRepository.createQueryBuilder('t')
            .update(TokensEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaTokensRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaTokensRepository.findOne({
            where: condition,
            order: orderBy,
        });
    }
    async getMyGivenEarnToken(condition: any) {
        let query = await this.readReplicaTokensRepository.createQueryBuilder('t')
        .where(condition)
        return await query.getCount();
    }
    async getTeamGivenEarnToken(condition: any) {
        let query = await this.readReplicaTokensRepository.createQueryBuilder('t')
        .where(condition)
        return await query.getCount();
    }
    async getComments(condition: any, paginationParam: PaginateWithCommentInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = 'DESC';
        const orderBy = 't.id';
        let query = this.readReplicaTokensRepository.createQueryBuilder('t')
        .leftJoinAndMapOne(
            't.users',
            tableConstant.TBL_USERS,
            'users',
            `t.user_id = users.id AND users.status = 1`
        )
        .leftJoinAndMapOne(
            't.userst',
            tableConstant.TBL_USERS,
            'userst',
            `t.to_user_id = userst.id AND userst.status = 1`
        )
        .where(condition)
        .select('t')
        .addSelect(`CONCAT(COALESCE(users.first_name, ''), ' ', COALESCE(users.last_name, ''))`, 'from_user_name')
        .addSelect(`CONCAT(COALESCE(userst.first_name, ''), ' ', COALESCE(userst.last_name, ''))`, 'to_user_name')
        .addSelect('users.profile_image', 'from_user_image')
        .orderBy(orderBy, <any>order)
        .offset(paginateObj.skip)
        .limit(paginateObj.take)
        const total = await query.getCount();
        const result = await query.getRawMany();
        return this.commonArrayService.paginationResponse(result, total, paginateObj);
    }
    async listRecord(condition: any, orderBy: any = null, fields: any[] = ['t']) {
        if (!orderBy) {
            orderBy = { 't.id': 'DESC' };
        }
        return await this.readReplicaTokensRepository.createQueryBuilder('t')
            .select(fields)
            .where(condition)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
            .getMany();
    }
}
