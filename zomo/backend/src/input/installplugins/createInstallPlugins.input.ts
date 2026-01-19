import { Allow } from 'class-validator';
export class CreateInstallPluginsInput {
    @Allow() id: number;
    @Allow() plugin_name: string;
    @Allow() display_name: string;
    @Allow() description: string;
    @Allow() old_plugin_version: string;
    @Allow() current_plugin_version: string;
    @Allow() plugin_install_date: string;
    @Allow() plugin_activate_date: string;
    @Allow() plugin_require_tbl_upgrade: string;
    @Allow() plugin_tables_used: string;
    @Allow() status: number;
}
