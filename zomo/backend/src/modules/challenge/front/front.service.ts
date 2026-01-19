import {
    appConstant,
    BrokerEntity,
    ChallengeEntity,
    HealthActivityEntity,
    ScheduleChallengeEntity,
    UserEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FrontService {
    constructor(
        @InjectRepository(ScheduleChallengeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaScheduleChallengeRepository: Repository<ScheduleChallengeEntity>,
        @InjectRepository(ChallengeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaChallengeRepository: Repository<ChallengeEntity>,
        @InjectRepository(BrokerEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicabrokerRepository: Repository<BrokerEntity>,
        @InjectRepository(UserEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaUserRepository: Repository<UserEntity>,
        @InjectRepository(HealthActivityEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaHealthActivityRepository: Repository<HealthActivityEntity>,
    ) {}
    async scheduleChallengeDetailsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        if (!orderBy) {
            orderBy = { 'sc.id' : 'DESC' };
        }
        let query: any = this.readReplicaScheduleChallengeRepository.createQueryBuilder('sc')
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
    async challengeListRecord(fields: any, condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaChallengeRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
    async brokerExists(condition: any) {
        return this.readReplicabrokerRepository.exist({
            where: condition
        });
    }
    async userDetailsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
        if (!orderBy) {
            orderBy = { 'user.id' : 'DESC' };
        }
        let query: any = this.readReplicaUserRepository.createQueryBuilder('user')
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
        }catch (error) {
            throw new Error(error.message);
        }
    }
    async healthActivityListRecord(fields: any[] = [], condition: any, orderBy: any = null): Promise<HealthActivityEntity[]> {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaHealthActivityRepository.find({
            select: fields,
            where: condition,
            order: orderBy,
        });
    }
}
