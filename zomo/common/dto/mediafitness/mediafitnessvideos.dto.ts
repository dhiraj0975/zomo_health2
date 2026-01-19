import { Expose, Transform, Type } from 'class-transformer';
import { UserSettingsDto } from "../user";
import { MediaFitnessDifficultyDto, MediaFitnessDurationRangeDto, MediaFitnessVideoCategoryDto, MediaFitnessVideoEquipmentDto, MediaFitnessVideoFocusDto, MediaFitnessVideoInstructorsDto } from "./index";
const link_URL = process.env.S3_VIDEO_IMG_URL_PROD
const S3_URL =  process.env.S3_URL_PROD
export class MediaFitnessVideosDto {
    @Expose() id: number;
    @Expose() v_id: number;
    @Expose() org_id: number;
    @Expose() v_link: string;
    @Expose() name: string;
    @Expose() duration: number;
    @Expose() difficulty_id: number;
    @Expose() calories: number;
    @Expose() description: string;
    // @Expose() image_poster: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if(obj.image_poster && obj.image_poster.includes('mevideo_')){
            return S3_URL + `media/video/${obj.org_id}/` + obj.image_poster;
        }
        else if(obj.image_poster && obj.image_poster != ''){
            return obj.image_poster;
        }
        else{
            return S3_URL + `emotionalwellbeing/NotFound.png`;
        }
    }, {
        toClassOnly: true,
    })
    image_poster: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if(obj.image_thumb && obj.image_thumb.includes('mevideo_')){
            return S3_URL + `media/video/${obj.org_id}/thumb/` + obj.image_thumb;
        }
        else if(obj.image_thumb && obj.image_thumb != ''){
            return obj.image_thumb;
        }
        else
        {
            return S3_URL + `emotionalwellbeing/NotFound.png`;
        }
    }, {
        toClassOnly: true,
    })
    image_thumb: string;
    @Expose() duration_id: number;
    @Expose() rating_avg: number;
    @Expose() rating_count: number;
    @Expose() rating_avg_category: number;
    @Expose() rating_count_category: number;
    @Expose() rating_avg_series: number;
    @Expose() rating_count_series: number;
    @Expose() provider_name: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => UserSettingsDto)
    @Transform(({ obj }) => {
        if (obj.settings && obj.settings.fitnessvideofavoriteslist) {
            var dataObj = JSON.parse(obj.settings.fitnessvideofavoriteslist);
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
    @Expose()
    @Type(() => MediaFitnessVideoCategoryDto)
    @Transform(({ obj }) => {
        let object = []
        if (obj.fvc) {
            return obj.fvc
        } else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    fvc: MediaFitnessVideoCategoryDto;
    @Expose()
    @Type(() => MediaFitnessVideoFocusDto)
    @Transform(({ obj }) => {
        let object = []
        if (obj.fvf) {
            return obj.fvf
        } else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    fvf: MediaFitnessVideoFocusDto;
    @Expose()
    @Type(() => MediaFitnessVideoEquipmentDto)
    @Transform(({ obj }) => {
        let object = []
        if (obj.fve) {
            return obj.fve
        } else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    fve: MediaFitnessVideoEquipmentDto;
    @Expose()
    @Type(() => MediaFitnessVideoEquipmentDto)
    @Transform(({ obj }) => {
        let object = []
        if (obj.fvs) {
            return obj.fvs
        } else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    fvs: MediaFitnessVideoEquipmentDto;
    @Expose()
    @Type(() => MediaFitnessDifficultyDto)
    @Transform(({ obj }) => {
        if (obj.fd) {
            return obj.fd
        } else {
            return null
        }
    }, {
        toClassOnly: true,
    })
    dificulty: MediaFitnessDifficultyDto;
    @Expose()
    @Type(() => MediaFitnessDifficultyDto)
    @Transform(({ obj }) => {
        if (obj.fd) {
            return obj.fd.name
        } else {
            return '-'
        }
    }, {
        toClassOnly: true,
    })
    fd: MediaFitnessDifficultyDto;
    @Expose()
    @Type(() => MediaFitnessDurationRangeDto)
    @Transform(({ obj }) => {
        if (obj.duration_range) {
            return obj.duration_range
        } else {
            return {}
        }
    }, {
        toClassOnly: true,
    })
    duration_range: MediaFitnessDurationRangeDto;
    @Expose()
    @Type(() => MediaFitnessVideoInstructorsDto)
    @Transform(({ obj }) => {
        let object = []
        if (obj.fvi) {
            return obj.fvi
        } else {
            return []
        }
    }, {
        toClassOnly: true,
    })
    fvi: MediaFitnessVideoInstructorsDto;
}
