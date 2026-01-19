import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
import { CompaniesDto } from './companies.dto';
import { DepartmentsDto } from './departments.dto';
import { LocationsDto } from './locations.dto';
const S3_URL =  process.env.S3_URL_PROD
export class WellnessAssignmentDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() location: number;
    @Expose() department: number;
    @Expose() state: string;
    @Expose() city: string;
    @Expose() is_global: number;
    @Expose() img_option: number;
    @Expose() img_area: number;
    @Expose() slider_limit: number;
    @Expose() big_img: string;
    @Expose() big_img_link: string;
    @Expose() big_img_link_isin: number;
    @Expose() big_img_link_id: number;
    @Expose() square_img1: string;
    @Expose() square_img_link1: string;
    @Expose() square_img_link1_isin: number;
    @Expose() square_img_link1_id: number;
    @Expose() square_img2: string;
    @Expose() square_img_link2: string;
    @Expose() square_img_link2_isin: number;
    @Expose() square_img_link2_id: number;
    @Expose() square_img3: string;
    @Expose() square_img_link3: string;
    @Expose() square_img_link3_isin: number;
    @Expose() square_img_link3_id: number;
    @Expose() square_img4: string;
    @Expose() square_img_link4: string;
    @Expose() square_img_link4_isin: number;
    @Expose() square_img_link4_id: number;
    @Expose() mob_big_img: string;
    @Expose() mob_square_img1: string;
    @Expose() mob_square_img2: string;
    @Expose() mob_square_img3: string;
    @Expose() mob_square_img4: string;
    @Expose() square_img_activity1: number;
    @Expose() square_img_activity2: number;
    @Expose() square_img_activity3: number;
    @Expose() square_img_activity4: number;
    @Expose() status: number;
    @Expose() eligibility: number;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                first_name: value.first_name,
                last_name: value.last_name,
                full_name: value.full_name ?? value.first_name + ' ' + value.last_name,
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value?.id,
                code: value?.code,
                company_name: value?.company_name,
                company_logo: value?.company_logo,
                company_logo_dark : value?.company_logo_dark
            };
        }
        else {
            return null
        }
    })
    company?: CompaniesDto;
    @Expose()
    @Type(() => LocationsDto)
    Location?: LocationsDto;
    @Expose()
    @Type(() => DepartmentsDto)
    Department?: DepartmentsDto;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj && obj.company_logo && obj.company_logo.includes('champimg_')) {
            return `${S3_URL}companylogos/${obj.org_id}/${obj.company_logo}`;
        } else {
            return obj.company_logo || '';
        }
    }, {
        toClassOnly: true,
    })
    company_logo: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj && obj.company_logo_dark && obj.company_logo_dark.includes('champimgdark_')) {
            return `${S3_URL}companylogos/${obj.org_id}/${obj.company_logo_dark}`;
        } else {
            return obj.company_logo_dark || '';
        }
    }, {
        toClassOnly: true,
    })
    company_logo_dark: string;
}
