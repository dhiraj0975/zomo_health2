import { Expose, Transform, Type } from 'class-transformer';
import { appConstant } from '../../constant/app.constant';
import { UserDto } from '../user';
export class MyPlanBusinessRuleDto {
    @Expose() id: number;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? value.toString() : '-'), {
        toClassOnly: true,
    })
    name: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.module_id) {
            return appConstant.MODULE_DATA[obj.module_id];
        } else {
            return '-';
        }
    }, {
        toClassOnly: true,
    })
    module_name: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.biometric_id) {
            return appConstant.BIO_DATA[obj.biometric_id];
        } else {
            return '-';
        }
    }, {
        toClassOnly: true,
    })
    type_name: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.biometric_id == '25' && (obj?.events?.event_name || obj?.ar?.title || obj?.ac?.activity_name || obj?.sc?.custom_cname || obj?.ql?.title || obj?.qz?.quiz_name)) {
            let activityNameObj = {'1': obj?.events?.event_name, '2': obj?.ar?.title, '3': obj?.ac?.activity_name, '4': obj?.sc?.custom_cname, '5': obj?.ql?.title, '6': obj?.qz?.quiz_name};
            return activityNameObj[obj.module_id];
        } else {
            return '-';
        }
    }, {
        toClassOnly: true,
    })
    activity_name: string;
    @Expose() biometric_id: number;
    @Expose() organization_id: number;
    @Expose() module_id: number;
    @Expose() activity_id: number;
    @Expose() progress: number;
    @Expose() status: number;
    @Expose() progress_setting: number;
    @Expose()
    c_start_date: string;
    @Expose()
    c_end_date: string;
    @Expose() type: number;
    @Expose() s_range: number;
    @Expose() e_range: number;
    @Expose() gender: number;
    @Expose() age: number;
    @Expose() ageoption: number;
    @Expose() age_s_range: number;
    @Expose() age_e_range: number;
    @Expose() created_by: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.organization_id && obj.company_name) {
            return {id: obj.organization_id,company_name: obj.company_name};
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    company: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.event_id && obj.event_name) {
            return {id: obj.event_id,title: obj.event_name};
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    event_list: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.assessment_id && obj.assessment_name) {
            return {id: obj.assessment_id,title: obj.assessment_name};
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    assessment_list: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.activity_id && obj.activity_name) {
            return {id: obj.activity_id,title: obj.activity_name};
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    activity_list: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.challenge_id && obj.challenge_name) {
            return {id: obj.challenge_id,title: obj.challenge_name};
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    challenge_list: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.quick_link_id && obj.quick_link_name) {
            return {id: obj.quick_link_id,title: obj.quick_link_name};
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    quick_link_list: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.quiz_id && obj.quiz_name) {
            return {id: obj.quiz_id,title: obj.quiz_name};
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    quiz_list: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.module_list) {
            return obj.module_list.filter(item => item !== null);
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    module_list: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ obj }) => {
        if (obj.users) {
            return {
                id: obj.users.id,
                first_name: obj.users.first_name,
                last_name: obj.users.last_name,
                full_name: obj.users.full_name ?? obj.users.first_name + ' ' + obj.users.last_name,
                username: obj.users.username,
            };
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    users: UserDto;
}
