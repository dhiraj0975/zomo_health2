import { Expose, Transform, Type } from 'class-transformer';
import { MediaPostDto } from "../mediafitness";
const S3_URL =  process.env.S3_URL_PROD
export class MediaCategoryDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() parent_id: number;
    @Expose() lft: number;
    @Expose() rght: number;
    @Expose() layout_type: number;
    @Expose() title: string;
    @Expose() description: string;
    // @Expose() img: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => MediaPostDto)
    @Transform(({ obj }) => {
        if (obj.post) {
            let array = [];
            for (let data of obj.post) {
                if(data.post_img && data.post_img.includes('media/post') && !data.post_img.includes(S3_URL)){
                    data.post_img = S3_URL + data.post_img;
                }
                if(data.display_area && data.display_area.includes('media/post') && !data.post_img.includes(S3_URL)){
                    data.display_area = S3_URL + data.display_area;
                }
                if ((data.atime_type != undefined || data.atime_type != null ) && data.atime) {
                    let time ='';
                    if(data.atime_type == 1){
                        time = `${data.atime}:00`;
                    }
                    else {
                        const hours = Math.floor(data.atime / 60);
                        const remainingMinutes = data.atime % 60;
                        const formattedHours = String(hours).padStart(2, '0');
                        const formattedMinutes = String(remainingMinutes).padStart(2, '0');
                        time = `${formattedHours}:${formattedMinutes}`;
                    }
                    data.time = time;
                } else {
                    data.time = "00:00";
                }
                let defImage = {post_img: data.post_img,
                    display_area: data.display_area ,
                }
                array.push({...data, ...{defImage}})
            }
            return array
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    post: MediaPostDto;
    @Expose() category_heirarchy: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('media/cat') && !value.includes(S3_URL) ? S3_URL + value : value), {
        toClassOnly: true,
    })
    img: string;
}
