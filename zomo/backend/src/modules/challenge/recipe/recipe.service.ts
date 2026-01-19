import { appConstant, CommonArrayService, CommonFileService, RecipeEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginateWithChallengeInput } from 'src/input';
import { Repository } from 'typeorm';
@Injectable()
export class RecipeService {
    constructor(
        @InjectRepository(RecipeEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaRecipeRepository: Repository<RecipeEntity>,
        @InjectRepository(RecipeEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaRecipeRepository: Repository<RecipeEntity>,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
    ) {}
    async paginateList(condition: any, paginationParam: PaginateWithChallengeInput) {
        const paginateObj = this.commonArrayService.getPaginationVar(
            paginationParam.page || 1,
            paginationParam.limit,
        );
        const order = paginationParam && paginationParam.order ? paginationParam.order : 'DESC';
        const orderBy = paginationParam && paginationParam.order_by ? paginationParam.order_by : 'recipe.created';
        let queryResult = await this.readReplicaRecipeRepository.createQueryBuilder('recipe')
            .leftJoinAndMapOne(
                'recipe.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = recipe.user_id AND user.status = 1`,
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
        const savedResult = this.writeReplicaRecipeRepository.create(data);
        return await this.writeReplicaRecipeRepository.save(savedResult);
    }
    async update(condition: any, data: any) {
        data = await this.commonFileService.filterDataByEntityColumns(data, this.writeReplicaRecipeRepository.metadata);
        return await this.writeReplicaRecipeRepository.createQueryBuilder('r')
            .update(RecipeEntity)
            .set(data)
            .where(condition)
            .execute();
    }
    async delete(condition: any){
        await this.writeReplicaRecipeRepository.delete(condition);
    }
    async findOne(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaRecipeRepository.createQueryBuilder('recipe')
          .leftJoinAndMapOne(
            'recipe.user',
            tableConstant.TBL_USERS,
            'user',
            `user.id = recipe.user_id AND user.status = 1`,
        )
        .where(condition)
        .orderBy(`recipe.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaRecipeRepository.createQueryBuilder('recipe')
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
          .select(['recipe','sc','ch','user.code','user.first_name','user.last_name','user.username'])
        .where(condition)
        .orderBy(`recipe.${Object.keys(orderBy)[0]}`, orderBy[Object.keys(orderBy)[0]])
        .getMany();
    }
    async paginateReport(condition: any, paginationParam: PaginateWithChallengeInput = null, fields: string[] = ['recipe'], joinTable: string[] = []) {
        let paginateObj: { [key: string]: any };
        if (paginationParam !== null) {
            paginateObj = this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            );
        }
        let queryResult = this.readReplicaRecipeRepository.createQueryBuilder('recipe')
            .innerJoinAndMapOne(
                'recipe.user',
                tableConstant.TBL_USERS,
                'user',
                `user.id = recipe.user_id AND user.status = 1`,
            )
            .innerJoinAndMapOne(
                'user.scj',
                tableConstant.CHALLENGE.TBL_CH_SCHEDULE_CHALLENGE_JOIN_USERS,
                'scj',
                `scj.user_id = user.id`,
            )
            .leftJoinAndMapOne(
                'user.company',
                tableConstant.COMPANIES.TBL_COMPANY,
                'company',
                `company.id = user.org_id AND company.status = 1`,
            )
            .leftJoinAndMapOne(
                'user.department',
                tableConstant.COMPANIES.TBL_DEPARTMENT,
                'department',
                `department.id = user.department_id`,
            )
            .leftJoinAndMapOne(
                'user.locations',
                tableConstant.COMPANIES.TBL_LOCATION,
                'locations',
                `locations.id = user.location`,
            )
            .leftJoinAndMapOne(
                'user.companySetting',
                tableConstant.COMPANIES.TBL_COMPANY_SETTINGS,
                'companySetting',
                `companySetting.org_id = user.org_id`,
            );
        if (joinTable && joinTable.includes(tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS)) {
            queryResult = queryResult
                .leftJoinAndMapOne(
                    'user.teamMember',
                    tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS,
                    'teamMember',
                    `teamMember.user_id = scj.user_id AND teamMember.team_id IN (SELECT team_id FROM ch_team_schedule WHERE schedule_id = scj.schedule_id AND status = 1) AND teamMember.status = 1`,
                )
        }
        queryResult = queryResult.where(condition)
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
            resultData = this.commonArrayService.paginationResponse(result, total, paginateObj);
        }
        return resultData;
    }
}
