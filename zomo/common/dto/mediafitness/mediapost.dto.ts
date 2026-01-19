import { Expose, Transform, Type } from 'class-transformer';
const S3_URL =  process.env.S3_URL_PROD
export class MediaPostDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() cat_id: number;
    @Expose() activity_id: number;
    @Expose() title: string;
    @Expose() link_title: string;
    // @Expose() post_img: string;
    @Expose() display_type: number;
    // @Expose() display_area: string;
    @Expose() atime: number;
    @Expose() atime_type: number;
    @Expose() short_desc: string;
    @Expose() more_desc: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose() category_heirarchy: string;
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
    @Type(() => String)
    @Transform(({ obj }) => {
        if(obj && obj?.post_img?.includes('media/post')){
            obj.post_img = S3_URL + obj?.post_img;
        }
        else if(obj && obj?.post_img?.includes('mepost_') && !obj?.post_img?.includes('media/post')){
            obj.post_img = S3_URL + `media/post/${obj?.org_id}/` + obj?.post_img;
        }
        return obj.post_img;
    }, {
        toClassOnly: true,
    })
    post_img: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if(obj && obj?.display_area?.includes('media/post') && obj?.display_area?.includes('mepattc')){
            obj.display_area = S3_URL + obj?.display_area;
        }
        else if(obj && obj?.display_area?.includes('mepattc') && !obj?.display_area?.includes('media/post')){
            obj.display_area = S3_URL + `media/post/${obj?.org_id}/post/` + obj?.display_area;
        }
        return obj.display_area;
    }, {
        toClassOnly: true,
    })
    display_area: string;
}
