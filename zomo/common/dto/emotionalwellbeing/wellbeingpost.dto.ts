import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
import { UserSettingsDto } from '../user';
const link_URL = process.env.S3_VIDEO_IMG_URL_PROD
const S3_URL =  process.env.S3_URL_PROD
export class WellBeingPostDto {
    @Expose() id: number;
    @Expose() ids: any;
    @Expose() org_id: number;
    @Expose() cat_id: number;
    @Expose() title: string;
    @Expose() link_title: string;
    @Expose() display_type: number;
    // @Expose() display_area: string;
    @Expose() atime: number;
    @Expose() atime_type: number;
    @Expose() short_desc: string;
    @Expose() more_desc: string;
    @Expose() maincollection: string;
    @Expose() secondarycategory: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() company_name: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        let path = S3_URL + `emotionalwellbeing/NotFound.png`;
        if(obj.post_img && obj.post_img != ''){
            if(obj.org_id && obj.org_id != 0 && obj.post_img.includes('emopost') && !obj.post_img.includes(S3_URL)){
                path = S3_URL + `emopost/${obj.org_id}/` + obj.post_img;
            }else{
                path=  S3_URL + `emotionalwellbeing/video/` + obj.post_img;
            }
        }
        return path;
    }, {
        toClassOnly: true,
    })
    post_img: string;
    @Expose()
    @Transform(({ obj }) => {
        if ((obj.atime_type != undefined || obj.atime_type != null ) && obj.atime) {
            let time ='';
            if(obj.atime_type == 1){
                time = `${obj.atime}:00`;
            }
            else {
                const hours = Math.floor(obj.atime / 60);
                const remainingMinutes = obj.atime % 60;
                const formattedHours = String(hours).padStart(2, '0');
                const formattedMinutes = String(remainingMinutes).padStart(2, '0');
                time = `${formattedHours}:${formattedMinutes}`;
            }
            return time;
        } else {
            return "00:00";
        }
    }, {
        toClassOnly: true,
    })
    time: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
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
    @Expose()
    @Type(() => UserSettingsDto)
    @Transform(({ obj }) => {
        if (obj.settings && obj.settings.videofavoriteslist) {
            var dataObj = JSON.parse(obj.settings.videofavoriteslist);
            return {
                status: dataObj.hasOwnProperty(obj.id)  ? true : false,
            };
        } else {
            return {status: false}
        }
    }, {
        toClassOnly: true,
    })
    settings: UserSettingsDto;
    @Expose() category_heirarchy: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        let path = '';
        if(obj.org_id && obj.org_id != 0){
            path = obj.display_area || '';
        }else{
            path = `emopost/0/post/` + obj.display_area;
        }
        if(obj.display_type == 2 && obj.display_type != ''){
            path = S3_URL + path;
        }
        return path;
    }, {
        toClassOnly: true,
    })
    display_area: string;
}
