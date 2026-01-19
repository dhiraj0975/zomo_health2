import {Expose, Transform, Type} from 'class-transformer';
import { InstallPluginsDto } from '../master';
export class MembershipPlanDto {
    @Expose() id: number;
    @Expose() default_plugins: string;
    @Expose() name: string;
    @Expose() description: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    @Type(() => InstallPluginsDto)
    @Transform(({ value }) => {
        if (value && value.length) {
            for(let element of value){
                Object.keys(element).forEach((key) => {
                    if (!['id','plugin_name','display_name','description','status'].includes(key)) {
                        delete element[key];
                    }
                    });
            }
            return value;
        }
        else {
            return []
        }
    })
    plugins: InstallPluginsDto[];
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
