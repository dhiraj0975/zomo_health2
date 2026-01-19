import { Expose, Transform, Type } from 'class-transformer';
import { LanguagesDto } from '../master';
import { InterlinksDto } from './interlinks.dto';
const S3_URL =  process.env.S3_URL_PROD
export class CompanyDashboardDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() square_img_link: string;
    @Expose() square_img_link_isin: number;
    @Expose() square_img_link_id: string;
    @Expose() status: number;
    @Expose() added_by: number;
    @Expose() reference_id: number;
    @Expose() displaybasedon: number;
    @Expose() image_order: number;
    @Expose() imglug_id: number;
    @Expose() imgopt_id: number;
    @Expose() square_img_activity: number;
    @Expose() dimg_eligibility: number;
    @Expose() dimg_visibility: number;
    @Expose() dimg_visibility_ids: string;
    @Expose() dimg_healthplan: number;
    @Expose() square_img_back_color: string;
    @Expose() square_img_icon_color: string;
    @Expose() square_img_text: string;
    @Expose() square_img_text_color: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('_webIsqr') && !value.includes(S3_URL) ? S3_URL + value : value && value.includes('dashboardimages') && !value.includes(S3_URL) ? S3_URL + value : value), {
        toClassOnly: true,
    })
    square_img: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('_mobIsqr') && !value.includes(S3_URL) ? S3_URL + value : value && value.includes('dashboardimages') && !value.includes(S3_URL) ? S3_URL + value : value), {
        toClassOnly: true,
    })
    mob_square_img: string;
    @Expose()
    @Transform(({ obj }) => {
        if(obj.dimg_healthplanname && obj.dimg_healthplanname != ''){
            obj['dimg_healthplanname'] = JSON.parse(obj.dimg_healthplanname);
            return obj['dimg_healthplanname'];
        }
        else {
            return []
        }
    })
    dimg_healthplanname: string;
    @Expose()
    from_date: string;
    @Expose()
    to_date: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => LanguagesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                title: value.title,
                native: value.native,
                alias: value.alias,
            };
        }
        else {
            return null
        }
    })
    language: LanguagesDto;
    @Expose()
    @Type(() => InterlinksDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                linktitle: value.linktitle,
                plugin: value.plugin,
                controller: value.controller,
                action: value.action,
                newlink: value?.newlink,
            };
        }
        else {
            return null
        }
    })
    internal_link: InterlinksDto;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.location) {
            const location = [];
            for(let element of obj.location){
                location.push({
                    id : element?.id,
                    location_name : element?.location_name,
                });
            }
            return location;
        }
        else {
            return []
        }
    })
    location: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj.department) {
            const department = [];
            for(let element of obj.department){
                department.push({
                    id : element?.id,
                    dept_name : element?.dept_name,
                });
            }
            return department;
        }
        else {
            return []
        }
    })
    department: any;
    @Expose()
    @Transform(({ obj }) => {
        if (obj && obj?.img_activity) {
            if(!!(obj.img_activity && obj.img_activity?.cust_name == '' && obj.img_activity?.activity)){
                obj.img_activity.cust_name = obj.img_activity?.activity?.activity_name;
            }
            return {
                id: obj.img_activity.id,
                activity_name: obj.img_activity?.cust_name,
                campaign_name: obj.img_activity?.campaign?.campaign_name,
            };
        }
        else {
            return null
        }
    })
    img_activity: any;
}
