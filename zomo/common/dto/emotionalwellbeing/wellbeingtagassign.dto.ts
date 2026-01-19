import { Transform, Type, Expose } from 'class-transformer';
import { WellBeingTagDto } from './wellbeingtag.dto';
export class WellBeingTagAssignDto {
    @Expose() id: number;
    @Expose() v_id: number;
    @Expose() t_id: number;
    @Expose() cat_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => WellBeingTagDto)
    @Transform(({ value }) => {
        if (value && value.id) {
            return {
                id: value.id,
                name: value.name,
            };
        }
        else {
            return null
        }
    })
    tag: WellBeingTagDto;
}
