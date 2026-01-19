import { Expose, Transform, Type } from 'class-transformer';
import { appConstant } from '../../constant/app.constant';
import { MyPlanBlocksDto, MyPlanPlansDto, UserDto } from '../index';
;
export class MyPlanAssignPlanDto {
    @Expose() id: number;
    @Expose() plan_id: number;
    @Expose() org_id: number;
    @Expose() activity_id: number;
    @Expose() status: number;
    @Expose() org_name: string;
    @Expose() display_plan_to: number;
    @Expose() based_on: number;
    @Expose() name: string;
    @Expose() completion_base: number;
    @Expose() display_plan_to_health_source: number;
    @Expose() display_plan_to_health: number;
    @Expose() c_range: number;
    @Expose() completion_on: number;
    @Expose() f_range: number;
    @Expose() frequency_base: number;
    @Expose() is_cron: number;
    @Expose() join_based_on: number;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ obj }) => {
        if (obj?.mp?.user) {
            return {
                id: obj.mp.user?.id,
                first_name: obj.mp.user?.first_name,
                last_name: obj.mp.user?.last_name,
                full_name: obj.mp.user?.full_name ?? obj.mp.user?.first_name + ' ' + obj.mp.user?.last_name,
                username: obj.mp.user.username,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    startdate: string;
    @Expose()
    enddate: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.based_on != undefined ) {
            let BasedOn: string[] = ['Activity Days','Custom date','End date'];
            return BasedOn[obj.based_on];
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    based_name: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj.plan_label) {
            return obj.plan_label;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    plan_label: string;
    @Expose() display_block: number;
    @Expose()
    @Type(() => MyPlanPlansDto)
    @Transform(({ obj }) => {
        if (obj.mp) {
            obj.mp.user = null;
            return obj.mp;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    mp: MyPlanPlansDto;
    @Expose()
    @Type(() => MyPlanBlocksDto)
    @Transform(({ obj }) => {
        if (obj.mb) {
            let arrayBlocks = [];
            let key = 0;
            for (let i = 0; i < obj.mb.length; i++) {
                let activityArray = [],activityNameArray = [];
                for (let k = 0; k < obj.mb[i]?.ma?.length; k++) {
                    let name: string;
                    switch (obj.mb[i].ma[k]?.module_id) {
                        case 1:
                            if (obj.mb[i].ma[k]?.ee && obj.mb[i].ma[k]?.is_category === 0) {
                                name = obj.mb[i].ma[k]?.ee?.event_name;
                            }
                            if (obj.mb[i].ma[k]?.eec && obj.mb[i].ma[k]?.is_category === 1) {
                                name = obj.mb[i].ma[k]?.eec?.category_name;
                            }
                            break;
                        case 2:
                            if (obj.mb[i].ma[k]?.har) {
                                name = obj.mb[i].ma[k]?.har?.title;
                            }
                            break;
                        case 4:
                            if (obj.mb[i].ma[k]?.csc) {
                                name = obj.mb[i].ma[k]?.csc?.custom_cname;
                            }
                            break;
                        case 5:
                            if (obj.mb[i].ma[k]?.ql) {
                                name = obj.mb[i].ma[k]?.ql?.title;
                            }
                            break;
                        case 6:
                            if (obj.mb[i].ma[k]?.qz) {
                                name = obj.mb[i].ma[k]?.qz?.quiz_name;
                            }
                            break;
                        case 7:
                            name = appConstant.HRA_DATA[obj.mb[i].ma[k]?.org_activity_id];
                            break;
                        case 8:
                            name = appConstant.BIO_DATA[obj.mb[i].ma[k]?.org_activity_id];
                            break;
                        case 9:
                            if (obj.mb[i].ma[k]?.ep) {
                                name = obj.mb[i].ma[k]?.ep?.title;
                            } else if (obj.mb[i].ma[k]?.org_activity_id == '0') {
                                name = 'All Emotional Well-Being';
                            }
                            break;
                        default:
                            name = obj.mb[i].ma[k]?.ac?.activity_name;
                            break;
                    }
                    activityNameArray.push({id: key,name: name,is_month: 0, is_month_days: 1,selected_activity_id: obj.mb[i].ma[k]?.activity_id,custom_activity: null});
                    key++;
                }
                for (let j = 0; j < obj.mb[i].mab?.maa.length; j++) {
                    let startDate = null,endDate = null;
                    if ([1,2].includes(obj.based_on)) {
                        startDate = obj.mb[i].mab?.maa[j]?.startdate ? new Date(obj.mb[i].mab?.maa[j]?.startdate) : new Date(obj?.startdate)
                        endDate = obj.mb[i].mab?.maa[j]?.enddate ? new Date(obj.mb[i].mab?.maa[j]?.enddate) : new Date(obj?.enddate)
                    }
                    activityArray.push({assign_activity_id: obj.mb[i].mab?.maa[j]?.id,activity_id: obj.mb[i].mab?.maa[j]?.activity_id,startdate: startDate,enddate: endDate,custom_activity: obj.mb[i].mab?.maa[j]?.name,is_month: obj.mb[i].mab?.maa[j]?.is_month ?? 0, is_month_days: obj.mb[i].mab?.maa[j]?.is_month_days ?? 1});
                }
                let startDate = null,endDate = null;
                if ([1,2].includes(obj.based_on)) {
                    startDate = obj.mb[i].mab?.startdate ? new Date(obj.mb[i].mab?.startdate) : new Date(obj?.startdate)
                    endDate = obj.mb[i].mab?.enddate ? new Date(obj.mb[i].mab?.enddate) : new Date(obj?.enddate)
                }
                let activity = activityNameArray.map((obj, index) => ({ ...obj, ...activityArray[index] }));
                arrayBlocks.push({id: obj.mb[i].id,name: obj.mb[i]?.name,order_id: obj.mb[i].order_id,custom_block: obj.mb[i].mab?.name,assign_block_id: obj.mb[i].mab?.id,startdate: startDate,enddate: endDate,activity: activity })
            }
            return arrayBlocks;
        } else {
            return null;
        }
    }, {
        toClassOnly: true,
    })
    mb: MyPlanBlocksDto;
}
