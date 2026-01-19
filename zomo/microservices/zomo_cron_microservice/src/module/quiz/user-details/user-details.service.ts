import {
    appConstant,
    BaseService,
    CommonArrayService,
    CommonFileService,
    tableConstant,
    UserDetailsEntity,
} from '@common-constants';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class UserDetailsService extends BaseService<UserDetailsEntity> {
    constructor(
        @InjectRepository(
            UserDetailsEntity,
            appConstant.READ_REPLICA.toLowerCase(),
        )
        private readonly readReplicaUserDetailsRepository: Repository<UserDetailsEntity>,
        @InjectRepository(UserDetailsEntity, appConstant.MAIN.toLowerCase())
        private readonly writeReplicaUserDetailsRepository: Repository<UserDetailsEntity>,
        commonArrayService: CommonArrayService,
    ) {
        super(
            readReplicaUserDetailsRepository,
            writeReplicaUserDetailsRepository,
            'userDetail',
            commonArrayService,
        );
    }
    async quizReport(condition: any, paginationParam: any = null, field: any[] =
        [
            'User.role_id', 'User.new_password', 'User.timezone', 'User.is_camp_eligible', 'User.department_id', 'User.location', 'User.org_id', 'User.id', 'User.email',
            'User.on_insurance_plan', 'User.gender', 'User.relationship_id', 'User.code', 'User.username', 'User.middle_name', 'User.dob', 'User.date_of_hire',
            'User.first_name', 'User.last_name', 'User.insurance_plan_name',
            'settings.jobtitle', 'settings.wphone', 'settings.hphone',
            'company.company_name', 'department.dept_name',
            'Location.lname', 'Location.address1', 'Location.city', 'Location.state', 'Location.zip', 'Location.country',
            'Qzuser.id', 'Qzuser.quiz_id', 'Qzuser.score', 'Qzuser.created_date', 'QzAssignQuiz.id', 'QzAssignQuiz.passing_score'
        ]
    ) {
        let paginateObj
        if (paginationParam !== null) {
            paginateObj = paginationParam !== null ? this.commonArrayService.getPaginationVar(
                paginationParam.page || 1,
                paginationParam.limit,
            ) : ''
        }
        let data = this.readReplicaUserDetailsRepository.createQueryBuilder('Qzuser')
            .innerJoinAndMapOne(
                'Qzuser.QzAssignQuiz',
                tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG,
                'QzAssignQuiz',
                `QzAssignQuiz.quiz_id = Qzuser.quiz_id`,
            )
            .innerJoinAndMapOne(
                'Qzuser.User',
                tableConstant.TBL_USERS,
                'User',
                `Qzuser.user_id = User.id`,
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
            .where(condition)
            // .orderBy('User.code', 'DESC')
            .orderBy('Qzuser.score', 'DESC')
            .select(field);
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
    async findDetailsReportData(condition: any, field: string[] = ['Qzuser']) {
        let data: any = this.readReplicaUserDetailsRepository.createQueryBuilder('Qzuser')
            .innerJoinAndMapOne(
                'Qzuser.User',
                tableConstant.TBL_USERS,
                'User',
                `Qzuser.user_id = User.id`,
            )
            .innerJoinAndMapOne(
                'Qzuser.QzAssignQuiz',
                tableConstant.QUIZ.TBL_QZ_ASSIGN_QUIZ_ORG,
                'QzAssignQuiz',
                `QzAssignQuiz.quiz_id = Qzuser.quiz_id`,
            )
            .leftJoinAndMapMany(
                'Qzuser.QzQuizUserDetail',
                tableConstant.QUIZ.TBL_QZ_QUIZ_USER_DETAILS,
                'QzQuizUserDetail',
                `Qzuser.id = QzQuizUserDetail.user_detail_id AND QzQuizUserDetail.skip=0`,
            )
            .leftJoinAndMapOne(
                'QzQuizUserDetail.QzQuizDetail',
                tableConstant.QUIZ.TBL_QZ_QUIZ_DETAILS,
                'QzQuizDetail',
                `QzQuizDetail.id = QzQuizUserDetail.question_id`
            )
            .innerJoinAndMapOne(
                'Qzuser.Quizzes',
                tableConstant.QUIZ.TBL_QZ_QUIZZES,
                'Quizzes',
                `QzAssignQuiz.quiz_id = Quizzes.id`,
            )
            .where(condition)
            .select(field)
            .orderBy('Qzuser.score', 'DESC')
            .addOrderBy('QzQuizDetail.quest_order', 'ASC');
        data = await data.getMany();
        return data;
    }
}
