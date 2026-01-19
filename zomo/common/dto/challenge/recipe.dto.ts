import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
const S3_URL =  process.env.S3_URL_PROD
export class RecipeDto {
    @Expose() id: number;
    @Expose() schedule_id: number;
    @Expose() user_id: number;
    @Expose() org_id: number;
    @Expose() recipe_name: string;
    @Expose() recipe_type: number;
    @Expose() recipe_ingredients: string;
    @Expose() recipe_direction: string;
    @Expose() recipe_additional_notes: string;
    @Expose() recipe_healthy: string;
    @Expose() status: number = 0;
    @Expose() added_source: number;
    @Expose() created_by: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => {
        if (value && (!value.includes('undefined') && !value.includes('object Object'))) {
            let splitUrl = value.split('/');
            let imageName = splitUrl.pop();
            return imageName;
        }else {
            return null;
        }
    })
    recipe_image: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                user_name: value.username,
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
}
