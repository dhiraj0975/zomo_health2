import { appConstant, CommonArrayService, SurveyUserAnswersEntity, tableConstant } from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class SurveyUserAnswersService {
    constructor(
        @InjectRepository(SurveyUserAnswersEntity, appConstant.READ_REPLICA.toLowerCase())
        private readonly readReplicaSurveyUserAnswersRepository: Repository<SurveyUserAnswersEntity>,
        private readonly commonArrayService: CommonArrayService,
    ) {}
    async findOne(condition: any, orderBy = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyUserAnswersRepository.createQueryBuilder('survey')
        .where(condition)
        .getOne();
    }
    async listRecord(condition: any, orderBy: any = null) {
        if (!orderBy) {
            orderBy = { id: 'DESC' };
        }
        return await this.readReplicaSurveyUserAnswersRepository.createQueryBuilder('survey')
        .where(condition)
        .getMany();
    }
    async surveyReport(condition: any, innerCondition: any, paginationParam: any = null, field: any[] =
        [
            'User.role_id', 'User.new_password', 'User.timezone', 'User.is_camp_eligible', 'User.department_id', 'User.location', 'User.org_id', 'User.id', 'User.email',
            'User.on_insurance_plan', 'User.gender', 'User.relationship_id', 'User.code', 'User.username', 'User.middle_name', 'User.dob', 'User.date_of_hire',
            'User.first_name', 'User.last_name', 'User.insurance_plan_name',
            'settings.jobtitle', 'settings.wphone', 'settings.hphone',
            'company.company_name', 'department.dept_name',
            'Location.lname', 'Location.address1', 'Location.city', 'Location.state', 'Location.zip', 'Location.country',
            'Surveyuseranswers.id', 'Surveyuseranswers.popup_id', 'Surveyuseranswers.question_answers', 'Surveyuseranswers.created'
            , "CONVERT_TZ(`Surveyuseranswers`.`created`,'UTC',CASE WHEN `User`.`timezone` != '' THEN `User`.`timezone` ELSE 'UTC' END) as converted_time"
        ]
    ) {
        let paginateObj
        if (paginationParam !== null) {
            paginateObj = paginationParam !== null ? this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            ) : ''
        }
        let data = this.readReplicaSurveyUserAnswersRepository.createQueryBuilder('Surveyuseranswers')
            .innerJoinAndMapOne(
                'Surveyuseranswers.User',
                tableConstant.TBL_USERS,
                'User',
                `${innerCondition}`
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
                'User.settings',
                tableConstant.TBL_USERS_SETTINGS,
                'settings',
                `settings.user_id = User.id`,
            )
            .leftJoinAndMapOne(
                'User.Surveypopup',
                tableConstant.SURVEY.TBL_C_SURVEY_POPUP,
                'Surveypopup',
                `Surveypopup.id = Surveyuseranswers.popup_id AND Surveypopup.org_id = User.org_id AND Surveypopup.status = 1`,
            )
            .where(condition)
            .orderBy('User.id', 'ASC')
            // .orderBy('Surveyuseranswers.id', 'DESC')
            // .addOrderBy('User.id','DESC')
            .select(field);
            // .groupBy('User.id');
            // .addGroupBy('DATE_FORMAT(Surveyuseranswers.created, "%Y-%m-%d")');
        let resultData
        if (paginationParam === null) {
            resultData = await data.getMany();
        }
        else {
            let finalData = await data.take(paginateObj.take).skip(paginateObj.skip).getManyAndCount();
            const result = finalData[0];
            const total = finalData[1];
            resultData = this.commonArrayService.paginationResponse(result, total, paginateObj);
        }
        return resultData
    }
}
