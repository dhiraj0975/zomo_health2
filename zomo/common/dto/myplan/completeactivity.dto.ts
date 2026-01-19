import { Expose, Transform, Type } from 'class-transformer';
import { ActivitiesDto } from "../activity";
import { CompaniesDto } from "../company";
import { UserDto } from '../user';
import { MyPlanActivityDto, MyPlanAssignActivityDto, MyPlanBlocksDto, MyPlanPlansDto } from "./index";
const S3_URL =  process.env.S3_URL_PROD
export class MyPlanCompleteActivityDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() custom_id: number;
    @Expose() activity_id: number;
    @Expose() notes: string;
    @Expose() created_by: number;
    @Expose() source: number;
    @Expose() status: number;
    @Expose() aftercompletestatus: number;
    @Expose() plan_name: string;
    @Expose() block_name: string;
    @Expose() activity_name: string;
    @Expose()
    image: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ obj }) => {
        if (obj.users) {
            return {
                id: obj?.users?.id,
                code: obj.users.code,
                first_name: obj.users.first_name,
                last_name: obj.users.last_name,
                full_name: obj.users.full_name ?? obj.users.first_name + ' ' + obj.users.last_name,
                username: obj.users.username,
                membership_code: obj.users.membership_code,
            };
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    users: UserDto;
    @Expose()
    @Type(() => MyPlanBlocksDto)
    @Transform(({ obj }) => {
        if (obj.mb) {
            return obj.mb;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    mb: MyPlanBlocksDto;
    @Expose()
    @Type(() => MyPlanActivityDto)
    @Transform(({ obj }) => {
        if (obj.ma) {
            return obj.ma;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    ma: MyPlanActivityDto;
    @Expose()
    @Type(() => MyPlanPlansDto)
    @Transform(({ obj }) => {
        if (obj.mp) {
            return obj.mp;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    mp: MyPlanPlansDto;
    @Expose()
    @Type(() => ActivitiesDto)
    @Transform(({ obj }) => {
        if (obj.ac) {
            return obj.ac;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    ac: ActivitiesDto;
    @Expose()
    @Type(() => MyPlanAssignActivityDto)
    @Transform(({ obj }) => {
        if (obj.aac) {
            return obj.aac;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    aac: MyPlanAssignActivityDto;
    @Expose()
    @Type(() => MyPlanActivityDto)
    @Transform(({ obj }) => {
        if (obj.mac) {
            return obj.mac;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    mac: MyPlanActivityDto;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ obj }) => {
        if (obj.company) {
            return obj.company;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    company: CompaniesDto;
}
