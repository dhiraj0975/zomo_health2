import { appConstant, DashboardWidgetsEntity, OrgThemesEntity, ThemesEntity, ThemeSettingsEntity } from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";
import { CoreThemesController } from "./corethemes/corethemes.controller";
import { CoreThemesService } from "./corethemes/corethemes.service";
import { DashboardWidgetsController } from "./dashboardwidgets/dashboardwidgets.controller";
import { DashboardWidgetsService } from "./dashboardwidgets/dashboardwidgets.service";
import { OrgThemesController } from "./orgthemes/orgthemes.controller";
import { OrgThemesService } from "./orgthemes/orgthemes.service";
import { ThemeSettingsController } from "./themesettings/themesettings.controller";
import { ThemeSettingsService } from "./themesettings/themesettings.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([ThemesEntity, OrgThemesEntity, DashboardWidgetsEntity, ThemeSettingsEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([ThemesEntity, OrgThemesEntity, DashboardWidgetsEntity, ThemeSettingsEntity], appConstant.MAIN.toLowerCase()),
],
    providers: [CoreThemesService, OrgThemesService, DashboardWidgetsService, ThemeSettingsService],
    controllers: [
        CoreThemesController,
        OrgThemesController,
        DashboardWidgetsController,
        ThemeSettingsController
    ],
    exports: [CoreThemesService, OrgThemesService, DashboardWidgetsService, ThemeSettingsService],
})
export class ThemesModule {}
