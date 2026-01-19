import {
    appConstant,
    CommonArrayService,
    CommonDateService,
    ScheduleChallengeEntity,
    tableConstant,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { RecipeService } from '../recipe/recipe.service';
import { TeamsService } from '../team/teams.service';
import { UserService } from 'src/module/user/user.service';
const S3_URL = process.env.S3_URL_PROD;
const moment = require('moment-timezone');

@Injectable()
export class RecipeChallengeReportService {
    constructor(
        private readonly teamsService: TeamsService,
        private readonly recipeService: RecipeService,
        private readonly userService: UserService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
    ) { }

    async recipeChallengeReport(
        schedule: Partial<ScheduleChallengeEntity>,
        condition: string = '',
        result_type: number = 1,
        paginateObj: any = null,
        teamCondition: string = '',
        groupCondition: string = '',
    ) {
        try {
            // condition += ` AND recipe.schedule_id = ${schedule?.id} AND ( recipe.status = 1 OR recipe.id IS NULL)`;
            let result: object[] = [];
            let getUser: any;
            let allgetteams: any;
            if (schedule['team'] == 1) {
                if (result_type === 1) {
                    allgetteams = await this.teamsService.getTeamAllReport(
                        `team.org_id = ${schedule?.org_id} AND scj.schedule_id = ${schedule?.id}`,
                        [
                            'team.id',
                            'team.tname',
                            'team.group_id',
                            'teamSchedule.id',
                            'challengeGroups.id',
                            'challengeGroups.name',
                        ],
                    );
                    getUser = await this.userService.challengeRecipeReportPaginate(
                        `${condition} AND User.org_id = ${schedule?.org_id} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`,
                        {
                            page: paginateObj?.page || 1,
                            limit:
                                paginateObj?.limit ||
                                appConstant.RECORD_PER_PAGE,
                        },
                        [
                            'User',
                            'Location',
                            'department.id',
                            'department.dept_name',
                            'company.id',
                            'company.company_name',
                            'companySetting.spouse_option',
                            'teamMember.id',
                            'teamMember.user_id',
                            'teamMember.team_id',
                            'scj.id',
                            'scj.schedule_id',
                            'scj.challenge_id',
                            'recipe',
                        ],
                        [tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS],
                    );
                } else {
                    allgetteams = await this.teamsService.getTeamAllReport(
                        `team.org_id = ${schedule?.org_id} AND scj.schedule_id = ${schedule?.id}`,
                        [
                            'team.id',
                            'team.tname',
                            'team.group_id',
                            'teamSchedule.id',
                            'challengeGroups.id',
                            'challengeGroups.name',
                        ],
                    );
                    getUser = await this.userService.challengeRecipeReportPaginate(
                        `${condition} AND User.org_id = ${schedule?.org_id} ${teamCondition != '' ? ' AND ' + teamCondition : ''} ${groupCondition != '' ? ' AND ' + groupCondition : ''}`,
                        null,
                        [
                            'User',
                            'Location',
                            'department.id',
                            'department.dept_name',
                            'company.id',
                            'company.company_name',
                            'companySetting.spouse_option',
                            'teamMember.id',
                            'teamMember.user_id',
                            'teamMember.team_id',
                            'scj.id',
                            'scj.schedule_id',
                            'scj.challenge_id',
                            'recipe',
                        ],
                        [tableConstant.CHALLENGE.TBL_CH_TEAM_MEMBERS],
                    );
                }
            } else {
                if (result_type === 1) {
                    getUser = await this.userService.challengeRecipeReportPaginate(
                        `${condition} AND User.org_id = ${schedule?.org_id}`,
                        {
                            page: paginateObj?.page || 1,
                            limit:
                                paginateObj?.limit ||
                                appConstant.RECORD_PER_PAGE,
                        },
                        [
                            'User',
                            'Location',
                            'department.id',
                            'department.dept_name',
                            'company.id',
                            'company.company_name',
                            'companySetting.spouse_option',
                            'recipe',
                        ],
                    );
                } else {
                    getUser = await this.userService.challengeRecipeReportPaginate(
                        `${condition} AND User.org_id = ${schedule?.org_id}`,
                        null,
                        [
                            'User',
                            'Location',
                            'department.id',
                            'department.dept_name',
                            'company.id',
                            'company.company_name',
                            'companySetting.spouse_option',
                            'recipe',
                        ],
                    );
                }
            }
            const option = {
                1: 'Breakfast',
                2: 'Lunch',
                3: 'Dinner',
                4: 'Appetizer',
                5: 'Dessert',
                6: 'Snack',
                7: 'Drink',
                8: 'Other',
            };
            let resultData = [];
            if (result_type == 1) {
                resultData = getUser?.list || [];
            } else {
                resultData = getUser || [];
            }
            if (resultData && resultData.length > 0) {
                for (const user of resultData) {
                    let userId = user.id;
                    let recipe = user?.recipe || {};
                    let recipeType = option[user?.recipe?.recipe_type] || '';
                    let teamName = '';
                    let groupName = '';
                    let groupId = '';
                    let teamId = '';
                    if (
                        user?.teamMember &&
                        user.teamMember.team_id &&
                        user.teamMember.team_id !== ''
                    ) {
                        if (allgetteams && allgetteams.length > 0) {
                            let team = allgetteams.find(
                                (team: any) =>
                                    team.id === user.teamMember.team_id,
                            );
                            if (team) {
                                teamName = team.tname;
                                teamId = team.id;
                                if (
                                    schedule?.group_status == 1 &&
                                    team?.group_id !== 0
                                ) {
                                    groupId = team?.group_id || 0;
                                    groupName =
                                        team?.challengeGroups?.name || '';
                                }
                            }
                        }
                    }
                    let recipeId = recipe.id || '';
                    let recipeName = recipe.recipe_name || '';
                    let recipeIngredients = recipe?.recipe_ingredients || '';
                    let recipeDescription = recipe?.recipe_direction || '';
                    let recipeHealthy = recipe?.recipe_healthy || '';
                    let recipeAdditionalNotes = recipe?.recipe_additional_notes || '';
                    let attachment = ((recipe?.recipe_image && recipe?.recipe_image !== undefined && recipe?.recipe_image !== '' && recipe?.recipe_image !== 'undefined') ? recipe?.recipe_image : '') || '';
                    let created = recipe?.created || '';
                    let monthName = this.commonDateService
                        .getTodayDate()
                        .format('MMM');
                    if (recipe['created'] && recipe['created'] != null) {
                        monthName = moment(recipe['created']).format('MMM');
                    }
                    else{
                        monthName = '';
                    }
                    if (recipe['created'] && recipe['created'] != null) {
                        created =
                            monthName +
                            ' ' +
                            moment(recipe['created']).format('D, YYYY');
                    } else {
                        created = '';
                    }
                    if (result_type == 1) {
                        let resultData = {
                            user_id: userId,
                            first_name: user.first_name || '',
                            last_name: user.last_name || '',
                            company_name: user.company?.company_name || '',
                            department_name: user.department?.dept_name || '',
                            employee_id: user?.employeeid || '',
                            recipe_name: recipeName,
                            recipe_type: recipeType,
                            team_name: teamName,
                            group_id: groupId,
                            group_name: groupName,
                            recipe_ingredients: recipeIngredients,
                            recipe_id: recipeId,
                            recipe_description: recipeDescription || '',
                            recipe_additional_notes: recipeAdditionalNotes || '',
                            recipe_healthy: recipeHealthy || '',
                            recipe_attachment: (attachment && attachment !== undefined && attachment !== '') ? S3_URL + attachment : '',
                            recipe_created: created,
                        };
                        result.push(resultData);
                    } else {
                        let userDetails = user || {};
                        delete userDetails?.password;
                        delete userDetails?.teamSchedule;
                        delete userDetails?.createdAt;
                        delete userDetails?.updatedAt;
                        let resultData = {
                            user: userDetails,
                            user_id: userId,
                            first_name: user.first_name || '',
                            last_name: user.last_name || '',
                            company_name: user.company?.company_name || '',
                            department_name: user.department?.dept_name || '',
                            employee_id: user?.employee_id || '',
                            recipe_name: recipeName,
                            recipe_type: recipeType,
                            team_name: teamName,
                            team_id: teamId,
                            group_id: groupId,
                            group_name: groupName,
                            recipe_ingredients: recipeIngredients,
                            recipe_id: recipeId,
                            recipe_description: recipeDescription || '',
                            recipe_additional_notes: recipeAdditionalNotes || '',
                            recipe_healthy: recipeHealthy || '',
                            recipe_attachment: (attachment && attachment !== undefined && attachment !== '') ? S3_URL + attachment : '',
                            recipe_created: created,
                        };
                        result.push(resultData);
                    }
                }
            }
            if (result_type == 1) {
                const paginateObj = this.commonArrayService.getPaginationVar(
                    getUser?.page || 1,
                    getUser?.limit || 10,
                );
                let total = getUser?.total || 0;
                let resultDetails = this.commonArrayService.paginationResponse(
                    result,
                    total,
                    paginateObj,
                );
                return resultDetails;
            } else {
                return result;
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }
}
