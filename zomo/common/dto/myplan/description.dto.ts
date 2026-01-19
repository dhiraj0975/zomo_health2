import { Expose, Transform, Type } from 'class-transformer';
import { appConstant } from '../../constant/app.constant';
import { CompaniesDto, UserDto } from "../index";
export class MyPlanDescriptionDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() module_id: number;
    @Expose() company_name: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.module_id !== null && obj.module_id !== undefined) {
            return appConstant.EVENT_NAME[obj.module_id];
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    event_name: CompaniesDto;
    @Expose() description: string;
    @Expose() created_by: number;
    @Expose() status: number;
    @Expose() created: string;
    @Expose() updated: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ obj }) => {
        if (obj.company) {
            return obj.company
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    company: CompaniesDto;
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
