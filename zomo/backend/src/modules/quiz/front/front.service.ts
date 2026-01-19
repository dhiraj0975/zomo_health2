import {
    appConstant, CompaniesEntity,
    QuizAssignQuizOrgEntity,
    QuizCategoriesEntity,
    QuizQuizzesEntity,
    UserDetailsEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FrontService {
    constructor(
        @InjectRepository(UserDetailsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserDetailsRepository: Repository<UserDetailsEntity>,
        @InjectRepository(QuizAssignQuizOrgEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizAssignQuizOrgRepository: Repository<QuizAssignQuizOrgEntity>,
        @InjectRepository(QuizCategoriesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaquizCategoriesRepository: Repository<QuizCategoriesEntity>,
        @InjectRepository(QuizQuizzesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaQuizQuizzesRepository: Repository<QuizQuizzesEntity>,
        @InjectRepository(CompaniesEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaCompanyRepository: Repository<CompaniesEntity>,
    ) {}
    async userDetailsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        if (!orderBy) {
            orderBy = { 'ud.id' : 'DESC' };
        }
        let query: any = this.readReplicaUserDetailsRepository.createQueryBuilder('ud')
        if(joinCondition && joinCondition?.length > 0){
            for(let i = 0; i < joinCondition?.length; i++){
                const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                switch (join_type) {
                    case 'left_one':
                        query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'left_many':
                        query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                    case 'inner_one':
                        query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'inner_many':
                        query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                }
            }
        }
        query = query.where(condition).select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        for (let i = 1; i < Object.keys(orderBy).length; i++) {
            query = query.addOrderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        }
        switch (dataType) {
            case 'getOne':
                query = query.getOne();
                break;
            case 'getMany':
                query = query.getMany();
                break;
            case 'getRawOne':
                query = query.getRawOne();
                break;
            case 'getRawMany':
                query = query.getRawMany();
                break;
            case 'getCount':
                query = query.getCount();
                break;
        }
        return await query;
    }
    async quizzesDetailsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        if (!orderBy) {
            orderBy = { 'qz.id' : 'DESC' };
        }
        let query: any = this.readReplicaQuizQuizzesRepository.createQueryBuilder('qz')
        if(joinCondition && joinCondition?.length > 0){
            for(let i = 0; i < joinCondition?.length; i++){
                const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                switch (join_type) {
                    case 'left_one':
                        query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'left_many':
                        query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                    case 'inner_one':
                        query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'inner_many':
                        query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                }
            }
        }
        query = query.where(condition).select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        for (let i = 1; i < Object.keys(orderBy).length; i++) {
            query = query.addOrderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        }
        switch (dataType) {
            case 'getOne':
                query = query.getOne();
                break;
            case 'getMany':
                query = query.getMany();
                break;
            case 'getRawOne':
                query = query.getRawOne();
                break;
            case 'getRawMany':
                query = query.getRawMany();
                break;
            case 'getCount':
                query = query.getCount();
                break;
        }
        return await query;
    }
    async quizAssignQuizOrgData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        if (!orderBy) {
            orderBy = { 'aqo.id' : 'DESC' };
        }
        let query: any = this.readReplicaQuizAssignQuizOrgRepository.createQueryBuilder('aqo')
        if(joinCondition && joinCondition?.length > 0){
            for(let i = 0; i < joinCondition?.length; i++){
                const { join_table, table, alias, on_condition, join_type } = joinCondition[i];
                switch (join_type) {
                    case 'left_one':
                        query = query.leftJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'left_many':
                        query = query.leftJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                    case 'inner_one':
                        query = query.innerJoinAndMapOne(join_table, table, alias, on_condition);
                        break;
                    case 'inner_many':
                        query = query.innerJoinAndMapMany(join_table, table, alias, on_condition);
                        break;
                }
            }
        }
        query = query.where(condition).select(fields)
            .orderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        for (let i = 1; i < Object.keys(orderBy).length; i++) {
            query = query.addOrderBy(`${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]]);
        }
        switch (dataType) {
            case 'getOne':
                query = query.getOne();
                break;
            case 'getMany':
                query = query.getMany();
                break;
            case 'getRawOne':
                query = query.getRawOne();
                break;
            case 'getRawMany':
                query = query.getRawMany();
                break;
            case 'getCount':
                query = query.getCount();
                break;
        }
        return await query;
    }
    async userDetailsCountData(condition: any) {
        const count = await this.readReplicaUserDetailsRepository.count({
            where: condition
        });
        return count;
    }
    async quizCategoriesExists(condition: any) {
        return this.readReplicaquizCategoriesRepository.exist({
            where: condition
        });
    }
    async quizCategoriesFindOne(condition: any) {
        return this.readReplicaquizCategoriesRepository.findOne({
            where: condition
        });
    }
    async quizQuizzesExists(condition: any) {
        return this.readReplicaQuizQuizzesRepository.exist({
            where: condition
        });
    }
    async companyFindOne(fields: any = [],condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaCompanyRepository.findOne({
            where: condition,
            select: fields,
            order: orderBy,
        });
    }
}
