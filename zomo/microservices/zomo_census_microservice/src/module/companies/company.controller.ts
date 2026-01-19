import { appConstant, CommonArrayService, CommonDateService, CommonFileService, CommonService, imageConstant, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Inject,
    Post,
    Put,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { lastValueFrom } from "rxjs";
import { In, Not } from "typeorm";
import { DepartmentService } from "../departments/department.service";

import { LocationService } from "../locations/location.service";
import { CompanyService } from './company.service';
const path = require('path');
@Controller('organization')
export class CompanyController {
    constructor(
        private readonly companyService: CompanyService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonDateService: CommonDateService,
        private readonly commonFileService: CommonFileService,
        
        private readonly departmentService: DepartmentService,
        @Inject('COMMON_SERVICE') 
        private commonMicroservice: ClientProxy,
        private readonly locationService: LocationService
    ) {}
    /*
     * Function to get paginate list of organizations
     * - can pass page, limit, order_by, order
     */
}
