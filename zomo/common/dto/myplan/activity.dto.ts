import { Expose, Transform, Type } from 'class-transformer';
import { appConstant } from '../../constant/app.constant';
import { CompaniesDto } from '../company';
const S3_URL =  process.env.S3_URL_PROD
export class MyPlanActivityDto {
    @Expose() id: number;
    @Expose() activity_id: number;
    @Expose() organization_id: number;
    @Expose() module_id : number;
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
    @Expose() type : number;
    @Expose() name : string;
    @Expose() order_id : number;
    @Expose() org_specific : string;
    @Expose() days : number;
    @Expose() block_id : number;
    @Expose() status : number;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.module_list) {
            return obj.module_list;
        } else {
            return null
        }
    })
    module_list: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.wellbeing_category) {
            return obj.wellbeing_category;
        } else {
            return null
        }
    })
    wellbeing_category: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.activity_list) {
            return obj.activity_list;
        } else {
            return null
        }
    })
    activity_list: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.link_list) {
            return obj.link_list;
        } else {
            return null
        }
    })
    link_list: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.video_type) {
            return obj.video_type;
        } else {
            return null
        }
    })
    video_type: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.ac && obj.activity_id > 0) {
            return obj.ac;
        } else {
            return null
        }
    })
    ac: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.post_video_type) {
            return obj.post_video_type;
        } else {
            return null
        }
    })
    post_video_type: any;
    @Expose()
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? S3_URL + value + '?' + Date.now() : value), {
        toClassOnly: true,
    })
    icon: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value && value.id) {
            return {
                id: value.id,
                company_name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose() org_activity_id : string;
    @Expose() wellbeing_category_id : number;
    @Expose() frequency_base : number;
    @Expose() f_type : number;
    @Expose() f_range : number;
    @Expose() fpost_id : number;
    @Expose() post_id : number;
    @Expose() e_range : number;
    @Expose() s_range : number;
    @Expose() display_type : number;
    @Expose() video_second : number;
    @Expose() healthplan : number;
    @Expose() healthplan_name : string;
    @Expose() button_text : string;
    @Expose() link : string;
    @Expose() link_type : number;
    @Expose() link_id : number;
    @Expose() description : string;
    @Expose() gender : number;
    @Expose() age : number;
    @Expose() ageoption : number;
    @Expose() age_s_range : number;
    @Expose() age_e_range : number;
    @Expose() add_image : number;
    @Expose() upload_text : string;
    @Expose() add_notes : number;
    @Expose() is_category : number;
    @Expose() option_activity_ids : string;
    @Expose() wtype : number;
    @Expose() wtypeunit : number;
    @Expose() grater_than : number;
    @Expose() hide_button : number;
    @Expose() created : string;
    @Expose() updated : string;
}
