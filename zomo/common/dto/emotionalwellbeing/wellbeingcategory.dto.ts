import { Expose, Transform, Type } from 'class-transformer';
import { WellBeingPostDto } from "../emotionalwellbeing";
const link_URL = process.env.S3_VIDEO_IMG_URL_PROD
const S3_URL =  process.env.S3_URL_PROD
export class WellBeingCategoryDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() parent_id: number;
    @Expose() lft: number;
    @Expose() rght: number;
    @Expose() layout_type: number;
    @Expose() title: string;
    @Expose() description: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) =>
        (value && value.includes('emocat') ? S3_URL + value : value
        ), { toClassOnly: true })
    img: string;
    @Expose()
    @Type(() => WellBeingPostDto)
    @Transform(({ obj }) => {
        if (obj.post) {
            let array = [];
            for (let data of obj.post) {
                if(data.post_img && data.post_img.includes('emopost') && !data.post_img.includes(S3_URL)){
                    data.post_img = S3_URL + `emopost/${data.org_id}/` + data.post_img;
                }
                else if(data.post_img && data.post_img != ''){
                    data.post_img =  S3_URL + `emotionalwellbeing/video/` + data.post_img;
                }
                else if(!data?.post_img || data?.post_img == '')
                {
                    data.post_img = S3_URL + `emotionalwellbeing/NotFound.png`;
                }
                let defImage = {
                    post_img: data.post_img,
                    display_area: (data.display_area && data.display_area.includes('emopost') ? S3_URL + data.display_area : data.display_area),
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
                array.push({...data, ...{defImage}})
            }
            return array
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    post: WellBeingPostDto;
    @Expose() category_heirarchy: string;
}
