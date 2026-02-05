import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
import {MyPlanAssignPlanDto} from "./assignplan.dto";
import * as moment from "moment-timezone";
const S3_URL =  process.env.S3_URL_PROD
export class MyPlanPlansDto {
    @Expose()
    @Expose() id: number;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.map && obj.map.name) {
            return obj.map.name
        } else {
            return obj.name;
        }
    }, {
        toClassOnly: true,
    })
    name: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('plans') ? S3_URL + value + '?' + Date.now() : value), {
        toClassOnly: true,
    })
    icon: string;
    @Expose() description: string;
    @Expose() created_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;

    @Expose()
    @Type(() => MyPlanAssignPlanDto)
    @Transform(({ obj }) => {
        if (obj.map) {
            obj.map.startdate = obj?.map?.startdate ? moment(obj.map.startdate, "YYYY-MM-DD HH:mm:ss").format("YYYY-MM-DD") : null
            obj.map.enddate = obj?.map?.enddate ? moment(obj.map.enddate, "YYYY-MM-DD HH:mm:ss").format("YYYY-MM-DD") : null
            return obj.map;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    assign_plan: MyPlanAssignPlanDto;

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
