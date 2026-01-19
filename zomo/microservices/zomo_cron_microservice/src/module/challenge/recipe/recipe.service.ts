import {
    appConstant,
    CommonArrayService,
    RecipeEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginateWithChallengeInput } from './input/paginateWithChallenge.input';
@Injectable()
export class RecipeService {
    constructor(
        @InjectRepository(RecipeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaRecipeRepository: Repository<RecipeEntity>,
        private readonly commonArrayService: CommonArrayService,
    ) {}

    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaRecipeRepository
            .createQueryBuilder('recipe')
            .leftJoinAndMapOne(
                'recipe.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = recipe.user_id AND user.status = 1`,
            )
            .where(condition)
            .orderBy(
                `recipe.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaRecipeRepository
            .createQueryBuilder('recipe')
            .leftJoinAndMapOne(
                'recipe.sc',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE,
                'sc',
                `sc.id = recipe.schedule_id AND sc.status = 1`,
            )
            .leftJoinAndMapOne(
                'recipe.ch',
                tableConstant.CHALLENGE.TBL_CH_CHALLENGE,
                'ch',
                `ch.id = sc.challenge_id AND ch.status = 1`,
            )
            .leftJoinAndMapOne(
                'recipe.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = recipe.user_id AND user.status = 1`,
            )
            .select([
                'recipe',
                'sc',
                'ch',
                'user.code',
                'user.first_name',
                'user.last_name',
                'user.username',
            ])
            .where(condition)
            .orderBy(
                `recipe.${Object.keys(orderBy)[0]}`,
                orderBy[Object.keys(orderBy)[0]],
            )
            .getMany();
    }
    async paginateReport(
        condition: any,
        paginationParam: PaginateWithChallengeInput = null,
        fields: string[] = ['recipe'],
        joinTable: string[] = [],
    ) {
        let paginateObj: { [key: string]: any };
        if (paginationParam !== null) {
            paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
        }
        let queryResult = this.readReplicaRecipeRepository
            .createQueryBuilder('recipe')
            .innerJoinAndMapOne(
                'recipe.User',
                tableConstant.TBL_USERS,
                'User',
                `User.id = recipe.user_id AND User.status = 1`,
            )
            .innerJoinAndMapOne(
                'User.scj',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                'scj',
                `scj.user_id = User.id`,
            )
            .leftJoinAndMapOne(
                'User.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = User.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'User.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = User.department_id`,
            )
            .leftJoinAndMapOne(
                'User.Location',
                tableConstant.COMPANIES.TBL_LOCATION,
                'Location',
                `Location.id = User.location`,
            )
            .leftJoinAndMapOne(
                'User.companySetting',
                tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                'companySetting',
                `companySetting.org_id = User.org_id`,
            );
        if (
            joinTable &&
            joinTable.includes(tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS)
        ) {
            queryResult = queryResult.leftJoinAndMapOne(
                'User.teamMember',
                tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
                'teamMember',
                `teamMember.user_id = scj.user_id AND teamMember.team_id IN (SELECT team_id FROM ch_team_schedule WHERE schedule_id = scj.schedule_id AND status = 1) AND teamMember.status = 1`,
            );
        }
        queryResult = queryResult
            .where(condition)
            .select(fields)
            .orderBy('recipe.user_id', 'ASC')
            .addOrderBy('recipe.created', 'DESC');
        let resultData: any;
        if (paginationParam === null) {
            resultData = await queryResult.getMany();
        } else {
            let data = await queryResult
                .take(paginateObj.take)
                .skip(paginateObj.skip)
                .getManyAndCount();
            const [result, total] = data;
            resultData = this.commonArrayService.paginationResponse(
                result,
                total,
                paginateObj,
            );
        }
        return resultData;
    }
}
