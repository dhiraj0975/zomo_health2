import {Expose, Transform, Type} from 'class-transformer';
export class ThemeSettingsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() theme_color: string;
    @Expose() header_color: string;
    @Expose() link_color: string;
    @Expose() icons_color: string;
    @Expose() button_color: string;
    @Expose() progress_color: string;
    @Expose() progress_hra_low_color: string;
    @Expose() progress_hra_mod_color: string;
    @Expose() progress_hra_high_color: string;
    @Expose() progress_hra_very_high_color: string;
    @Expose() table_color: string;
    @Expose() background_color: string;
    @Expose() enable_theme_mode: number;
    @Expose() reference_id: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
