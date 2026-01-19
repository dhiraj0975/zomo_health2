import {
    appConstant, CompanySideMenuSettingsEntity,
    MediaCategoryEntity, MediaFitnessVideosEntity
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class FrontService {
    constructor(
        @InjectRepository(CompanySideMenuSettingsEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSideMenuSettingsRepository: Repository<CompanySideMenuSettingsEntity>,
        @InjectRepository(MediaCategoryEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaMediaCategoryRepository: Repository<MediaCategoryEntity>,
        @InjectRepository(MediaFitnessVideosEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaFitnessVideosRepository: Repository<MediaFitnessVideosEntity>,
    ) {}
    async sideMenuSettingsData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne') {
        try{
            if (!orderBy) {
                orderBy = { 'sms.id' : 'DESC' };
            }
            let query: any = this.readReplicaSideMenuSettingsRepository.createQueryBuilder('sms')
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
    async fitnessVideosData(fields: any[] = [],condition: any, orderBy: any = null, joinCondition: any[] = [],dataType: any = 'getOne',groupBy: any = null) {
        try{
            if (!orderBy) {
                orderBy = { 'fitnessVideo.id' : 'DESC' };
            }
            let query: any = this.readReplicaFitnessVideosRepository.createQueryBuilder('fitnessVideo')
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
            if (groupBy) {
                for (let i = 0; i < groupBy.length; i++) {
                    if (i === 0) {
                        query = query.groupBy(`${groupBy[i]}`);
                    } else {
                        query = query.addGroupBy(`${groupBy[i]}`);
                    }
                }
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
    async mediaCategoryClicksExists(condition: any) {
        return this.readReplicaMediaCategoryRepository.exist({
            where: condition
        });
    }
}
