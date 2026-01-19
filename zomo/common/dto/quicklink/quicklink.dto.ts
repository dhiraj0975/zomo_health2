import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
import { QuicklinkfoldersDto } from './quicklinkfolders.dto';
export class QuicklinkDto {
    @Expose() id?: number;
    @Expose() c_companies_id? : number;
    @Expose() folder_id?: string;
    @Expose() title?: string;
    @Expose() description?: string;
    @Expose() link?: string;
    @Expose() sort_order?: number;
    @Expose() is_video?: number;
    @Expose() activity_id?: number;
    @Expose() eligibility?: number;
    @Expose() status?: number;
    //@Expose() healthplanname: string;
    @Expose() usernotonhealthplan?: number;
    @Expose() dispalybasedon?: number;
    @Expose() created_by?: number;
    @Expose() updated_by?: number;
    @Expose() link_count?: number;
    @Expose() folder_count?: number;
    @Expose()
    created?: string;
    @Expose()
    modified?: string;
    @Expose()
    fromdate?: string;
    @Expose()
    todate?: string;
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
    company?: CompaniesDto;
    @Expose()
    @Transform(({ obj }) => {
        return obj?.link?.startsWith('http://') || obj?.link?.startsWith('https://') ? 1 : 0;
    })
    linkType?: any;
    @Expose()
    @Type(() => QuicklinkfoldersDto)
    @Transform(({ value }) => {
        if (value && value.id) {
            return {
                id: value?.id,
                folder_name: value?.folder_name,
                healthplanname: (value?.healthplanname && value?.healthplanname?.length>0) ? ((Array.isArray(value?.healthplanname)) ? value?.healthplanname : JSON.parse(value?.healthplanname)) : [],
                usernotonhealthplan: value?.usernotonhealthplan,
                c_companies_id: value?.c_companies_id,
            };
        }
        else {
            return null
        }
    })
    folder?: QuicklinkfoldersDto;
    // @Expose()
    // @Transform(({ obj }) => {
    //     if (obj && obj.folder) {
    //         return {
    //             id: obj.id,
    //             company_name: obj.company_name,
    //         };
    //     }
    //     else {
    //         return null
    //     }
    // })
    // folder: any;
    @Expose()
    @Transform(({ obj }) => {
        if(obj &&  obj?.healthplanname && obj?.healthplanname?.length>0){
            if(Array.isArray(obj?.healthplanname)){
                return obj.healthplanname;
            }
            else{
                try {
                    return JSON.parse(obj?.healthplanname);
                } catch (error){
                    return [];
                }
            }
        } 
        else {
            return []
        }
    })
    healthplanname?: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.orglist) {
            const orglist = [];
            for(let element of obj.orglist){
                orglist.push({
                    id : element?.org?.id,
                    record_id : element?.id,
                    company_name : element?.org?.company_name,
                });
            }
            return orglist;
        }
        else {
            return []
        }
    })
    orglist?: any;
}
