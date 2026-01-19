import {
    appConstant, DiseaseFormCoverPagesEntity,
    DiseaseFormsEntity,
    DiseaseManageFormsEntity, DiseasePhysicianFormsEntity,
    DiseasesEntity, DiseaseStandardCareEntity,
    ManageDiseaseEntity
} from '@common-constants';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiseaseFormsController } from "./diseaseforms/diseaseforms.controller";
import { DiseaseFormsService } from "./diseaseforms/diseaseforms.service";
import { DiseasesController } from "./diseases/diseases.controller";
import { DiseasesService } from "./diseases/diseases.service";
import { DiseaseFormCoverPageController } from "./formscoverpage/diseaseformcoverpage.controller";
import { DiseaseFormCoverPageService } from "./formscoverpage/diseaseformcoverpage.service";
import { ManageDiseaseController } from "./manageDisease/managedisease.controller";
import { ManageDiseaseService } from "./manageDisease/managedisease.service";
import { ManageFormsController } from "./manageforms/manageforms.controller";
import { ManageFormsService } from "./manageforms/manageforms.service";
import { PhysicianFormsController } from "./physicianforms/physicianforms.controller";
import { PhysicianFormsService } from "./physicianforms/physicianforms.service";
import { StandardCareController } from "./standardcare/standardcare.controller";
import { StandardCareService } from "./standardcare/standardcare.service";
@Module({
    imports: [
        TypeOrmModule.forFeature([ DiseasesEntity, DiseaseFormsEntity, DiseaseFormCoverPagesEntity, ManageDiseaseEntity, DiseaseManageFormsEntity, DiseasePhysicianFormsEntity, DiseaseStandardCareEntity], appConstant.READ_REPLICA.toLowerCase()),
        TypeOrmModule.forFeature([ DiseasesEntity, DiseaseFormsEntity, DiseaseFormCoverPagesEntity, ManageDiseaseEntity, DiseaseManageFormsEntity, DiseasePhysicianFormsEntity, DiseaseStandardCareEntity], appConstant.MAIN.toLowerCase()),
    ],
    providers: [DiseasesService, DiseaseFormsService, DiseaseFormCoverPageService, ManageDiseaseService, ManageFormsService, PhysicianFormsService, StandardCareService],
    controllers: [DiseasesController, DiseaseFormsController, DiseaseFormCoverPageController, ManageDiseaseController, ManageFormsController, PhysicianFormsController, StandardCareController],
    exports: [DiseasesService, DiseaseFormsService, DiseaseFormCoverPageService, ManageDiseaseService, ManageFormsService, PhysicianFormsService, StandardCareService],
})
export class DiseaseManagementModule {}
