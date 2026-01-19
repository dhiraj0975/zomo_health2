import { Transform, Type, Expose } from 'class-transformer';
import { DataManagementFilesDto } from './datamanagementFiles.dto';
export class DataManagementFilesOrganizationsDto {
    @Expose() id: number;
    @Expose() file_id: number;
    @Expose() organization_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => DataManagementFilesDto)
    @Transform(({ value }) => (value ? value : null), {
        toClassOnly: true,
    })
    file: DataManagementFilesDto;
}
