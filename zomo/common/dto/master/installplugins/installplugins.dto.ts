import { Expose, Transform, Type } from 'class-transformer';
import { Required } from '../../../enum';
export class InstallPluginsDto {
    @Expose() id: number;
    @Expose() plugin_name: string;
    @Expose() display_name: string;
    @Expose() description: string;
    @Expose() old_plugin_version: string;
    @Expose() current_plugin_version: string;
    @Expose() plugin_install_date: string;
    @Expose() plugin_activate_date: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => 
        (Object.keys(Required).find(key => Required[key] === value)), {
        toClassOnly: true,
    })
    plugin_require_tbl_upgrade: string;
    @Expose() plugin_tables_used: string;
    @Expose() status: number;
}
