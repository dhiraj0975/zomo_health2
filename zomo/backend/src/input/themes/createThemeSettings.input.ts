import { Allow } from 'class-validator';
export class CreateThemeSettingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() header_color: string;
    @Allow() theme_color: string;
    @Allow() link_color: string;
    @Allow() icons_color: string;
    @Allow() button_color: string;
    @Allow() progress_color: string;
    @Allow() progress_hra_low_color: string;
    @Allow() progress_hra_mod_color: string;
    @Allow() progress_hra_high_color: string;
    @Allow() progress_hra_very_high_color: string;
    @Allow() progress_very_high_color: string;
    @Allow() table_color: string;
    @Allow() enable_theme_mode: number;
    @Allow() status: number;
    @Allow() reference_id: number;
}
