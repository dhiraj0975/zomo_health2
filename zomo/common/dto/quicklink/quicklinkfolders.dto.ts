import { Transform, Type, Expose } from 'class-transformer';
import { CompaniesDto } from '../company';
import { json } from 'stream/consumers';
export class QuicklinkfoldersDto {
    @Expose() id: number;
    @Expose() folder_name : string;
    @Expose() c_companies_id: number;
    @Expose() status: number;
    //@Expose() healthplanname: string;
    @Expose() usernotonhealthplan: number;
    @Expose() global_folder: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() created: string;
    @Expose() updated: string;
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
    @Transform(({ obj }) => {
        if (obj && obj.orglist) {
            const orglist = [];
            for(let element of obj.orglist){
                orglist.push({
                    record_id: element.id,
                    id : element?.org?.id ? element?.org?.id : element?.c_companies_id,
                    company_name : element?.org?.company_name,
                });
            }
            return orglist;
        }
        else {
            return []
        }
    })
    orglist: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.healthplanname) {
            return JSON.parse(obj.healthplanname);
        }
        else {
            return []
        }
    })
    healthplanname: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.Quicklink) {
            const Quicklinks = [];
            for(let element of obj.Quicklink){
                Quicklinks.push({
                    id : element?.id,
                    company_id : element?.c_companies_id,
                    folder_id : element?.folder_id,
                    doc_link : element?.link,
                    title:element?.title
                });
            }
            return Quicklinks;
        }
        else {
            return []
        }
    })
    Quicklink: any;
}
