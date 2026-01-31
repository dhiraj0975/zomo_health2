import { appConstant, CommonArrayService, CommonService, DepartmentsDto, tableConstant } from '@common-constants';
import {
    Body,
    Controller,
    HttpException,
    HttpStatus,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Request, Response } from "express";
import { ActivityLogService } from 'src/modules/master/activitylog/activitylog.service';
import { TranslationService } from 'src/modules/translation/translation.service';
import { UserService } from 'src/modules/user/user/user.service';
import { In, Like, Not } from 'typeorm';
import { AccessGuard, RoleGuard, TokenGuard } from '../../../guard';
import {
    CreateDepartmentInput,
    PaginateWithCompanyInput,
    UpdateDepartmentInput,
} from '../../../input';
import { FrontService } from "../front/front.service";
import { DepartmentService } from './department.service';
@Controller('department')
@UseGuards(TokenGuard, RoleGuard, AccessGuard)
export class DepartmentController {
    constructor(
        private readonly departmentService: DepartmentService,
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly translatorService: TranslationService,
        private readonly activityLogService: ActivityLogService,
        private readonly userService: UserService,
        private readonly frontService: FrontService,
    ) {}
    /*
     * Function to get paginate list of departments
     * - company_id is mandatory params
     * - can pass page, limit, order_by, order
     */
    @Post('paginate')
    async paginate(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: PaginateWithCompanyInput,
    ) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            if (postData?.company_id == undefined || postData?.company_id == null) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            let where = `department.deleted = 0 AND department.company_id = '${postData?.company_id}'`;
            if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                where += ` AND department.id IN (${postData?.department_id ? postData?.department_id : 0})`;
            }
            if (postData?.search_str) {
                where +=  this.commonService.generateDynamicSearchQuery(postData?.search_str,['department.id','department.dept_name','department.code','department.dept_desc']); 
            }
            const resultedData = await this.departmentService.paginateList(
                where,
                postData,
            );
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(
                    DepartmentsDto,
                    resultedData['list'],
                    req.lang
                )
            );
            if (req.lang != 'eng') {
                await Promise.all(resultedData['list'].map(async (ele) => {
                    if (ele.dept_name) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `department_name_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Department/${ele?.company_id}/${ele['id']}`, `dynamic`);
                        ele.dept_name = (customName == '' || customName == `department_name_${ele['id']}`) ? ele['dept_name'] : customName;
                    }
                    if (ele.dept_desc) {
                        let customName = await this.translatorService.frontendReadTranslation(req.lang, `department_desc_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Department/${ele?.company_id}/${ele['id']}`, `dynamic`);
                        ele.dept_desc = (customName == '' || customName == `department_desc_${ele['id']}`) ? ele['dept_desc'] : customName;
                    }
                }));
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /*
     * Function to get details of the department
     * - id and company_id is mandatory params
     */
    @Post('get-one')
    async getOne(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.company_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = {
                id: postData?.id,
                company_id: postData?.company_id,
                deleted: 0,
            };
            let depDetails = await this.departmentService.findOne(where);
            if (!depDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            depDetails = <any>(
                await this.commonArrayService.formatToDto(DepartmentsDto, depDetails, req.lang)
            );
            if (req.lang != 'eng') {
                if (depDetails.dept_name) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `department_name_${depDetails['id']}`, `/LC_MESSAGES/OrgAdmin/Department/${depDetails?.company_id}/${depDetails['id']}`, `dynamic`);
                    depDetails.dept_name = (customName == '' || customName == `department_name_${depDetails['id']}`) ? depDetails['dept_name'] : customName;
                }
                if (depDetails.dept_desc) {
                    let customName = await this.translatorService.frontendReadTranslation(req.lang, `department_desc_${depDetails['id']}`, `/LC_MESSAGES/OrgAdmin/Department/${depDetails?.company_id}/${depDetails['id']}`, `dynamic`);
                    depDetails.dept_desc = (customName == '' || customName == `department_desc_${depDetails['id']}`) ? depDetails['dept_desc'] : customName;
                }
            }
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: depDetails,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /*
     * Function to get list of departments
     * - company_id is mandatory params
     * - can pass search_str, order_by, order
     */
    @Post('list')
    async list(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            let user = req?.tokenUser;
            let where: any = { status: 1, deleted: 0 };
            if (!postData?.company_id) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang,'ERR_REQUIRED_PARAM_MISSING'));
            }
            if(postData?.type === 'hra'){
                let result = await this.frontService.departmentData( ["DISTINCT(department.id) AS id", "department.dept_name AS dept_name","company.company_name AS company_name"],`department.company_id IN (${postData?.company_id}) AND department.deleted = '0' AND company.companytype_id = '3'`,{ 'department.id' : 'ASC' },[{'join_table': 'department.user','alias':'user', 'table' : tableConstant.TBL_USERS, 'on_condition' : `user.department_id = department.id AND user.status = '1'`, 'join_type': 'inner_one' },{'join_table': 'company.department','alias':'company', 'table' : tableConstant.COMPANIES.TBL_COMPANY, 'on_condition' : `department.company_id = company.id`, 'join_type': 'inner_one' }],'getRawMany');
                result = <any>(
                    await this.commonArrayService.formatToDto(DepartmentsDto, result, req.lang)
                );

               /* console.log('EmailCampaign Departments (hra) =>', result.map((d) => ({ id: d.id, dept_name: d.dept_name })));*/
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: result,
                    message: 'success',
                });
            }
            if(postData?.type === 'report'){
                let companyIds = this.commonArrayService.transformToArray(postData?.company_id, ',');
                let whereReport = `department.deleted = 0 AND department.company_id IN (${companyIds.join(',')})`
                if (appConstant.ROLE.WCH == req.tokenUser?.role_id) {
                    //for only assign department listing add 'department' at last of function call usersDataWellness
                    // const userList = await this.userService.usersDataWellness(user, `user.role_id != 1 AND user.id != ${user.id} AND user.membership_code = '${user['membership_code']}' AND user.status =1` , 'department');    // for only assign department wise
                    const userList = await this.userService.usersDataWellness(user, `user.role_id != 1 AND user.id != ${user.id} AND user.membership_code = '${user['membership_code']}' AND user.status =1`);     // direct with all users wise who have champion
                    if (!userList || userList.length == 0) {
                        whereReport += ` AND user.id = 0`;
                    } else {
                        whereReport += ` AND user.id IN (${userList.map(ele => ele.id).join(',')})`;
                    }
                }
                let result = await this.departmentService.userWiseDepartmentList(whereReport,['department.id','department.dept_name']);
                result = <any>(
                    await this.commonArrayService.formatToDto(DepartmentsDto, result, req.lang)
                );
                if (req.lang != 'eng') {
                    await Promise.all(result.map(async (ele) => {
                        if (ele.dept_name) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `department_name_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Department/${ele?.company_id}/${ele['id']}`, `dynamic`);
                            ele.dept_name = (customName == '' || customName == `department_name_${ele['id']}`) ? ele['dept_name'] : customName;
                        }
                        if (ele.dept_desc) {
                            let customName = await this.translatorService.frontendReadTranslation(req.lang, `department_desc_${ele['id']}`, `/LC_MESSAGES/OrgAdmin/Department/${ele?.company_id}/${ele['id']}`, `dynamic`);
                            ele.dept_desc = (customName == '' || customName == `department_desc_${ele['id']}`) ? ele['dept_desc'] : customName;
                        }
                    }));
                }
                // Debug log for email campaign filters: department dropdown shape (report type)
                console.log('EmailCampaign Departments (report) =>', result.map((d) => ({ id: d.id, dept_name: d.dept_name })));
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: result,
                    message: 'success',
                });
            }
            postData.company_id = postData?.company_id.toString();
            where['company_id'] = In(postData?.company_id.split(','));
            postData = this.commonService.sanitizePayload(postData)
            if (postData?.search_str) {
                where = [
                    {
                        status: 1,
                        company_id: In(postData?.company_id.split(',')),
                        dept_name: Like('%' + postData?.search_str + '%'),
                        deleted:0,
                    },
                    {
                        status: 1,
                        company_id: In(postData?.company_id.split(',')),
                        code: Like('%' + postData?.search_str + '%'),
                        deleted:0,
                    },
                ];
            }
            const order = postData && postData?.order ? postData?.order : 'DESC';
            const orderBy = postData && postData?.order_by ? postData?.order_by : 'id';
            let result = await this.departmentService.listRecord(where, {
                [orderBy] : order,
            });
            if(postData?.type == 'all'){
                let allDepartmentsOption:any = {
                    id: 0,
                    code: '',
                    dept_name: 'All Departments',
                    default_dept: '',
                };
                result.unshift(allDepartmentsOption);
            }
            result = <any>(
                await this.commonArrayService.formatToDto(DepartmentsDto, result, req.lang)
            );
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: result,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: [],
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /*
     * Use to create new department
     * - company_id, dept_name, status is mandatory params
     */
    @Post('create')
    async create(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: CreateDepartmentInput,
    ) {
        try {
            if (
                !postData?.company_id ||
                !postData?.dept_name 
            ) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            postData.dept_name = postData?.dept_name.trim();
            const deptCheck = await this.departmentService.findOne({
                dept_name: postData?.dept_name,
                company_id: postData?.company_id,
                deleted: 0,
            });
            if (deptCheck) {
                throw Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_DEPARTMENT_NAME_EXIST',
                    ),
                );
            }
            const saveResult = await this.departmentService.save(postData);
            const deptID = saveResult.identifiers[0].id;
            let dynamicDatas = Object.create(null);
            if(postData?.dept_name){
                let tilte = `department_name_${deptID}`
                dynamicDatas[`${tilte}`]= postData?.dept_name;
            } 
            if(postData?.dept_desc){
                let tilte = `department_desc_${deptID}`
                dynamicDatas[`${tilte}`]= postData?.dept_desc;
            }
            await this.translatorService.DynamicEngJsonData('OrgAdmin',postData?.company_id,dynamicDatas,'Edit','Department',deptID);
            let deptCode = this.commonService.generateCode('D', deptID);
            let codeCheck = await this.departmentService.findOne({
                code: deptCode,
            });
            while (codeCheck) {
                deptCode = this.commonService.generateCode('D', deptID);
                codeCheck = await this.departmentService.findOne({
                    code: deptCode,
                });
            }
            await this.departmentService.update(
                { id: deptID },
                { code: deptCode },
            );
            return res.status(HttpStatus.CREATED).json({
                statusCode: 201,
                success: 1,
                error: 0,
                data: null,
                message: 'Department has been added successfully.',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /*
     * Use to update department
     * - id and company_id is mandatory params
     */
    @Put('update')
    async update(
        @Req() req: Request,
        @Res() res: Response,
        @Body() postData: UpdateDepartmentInput,
    ) {
        try {
            if (!postData?.id || !postData?.company_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = {
                id: postData?.id,
                deleted: 0,
                company_id: postData?.company_id,
            };
            const recordDetails = await this.departmentService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            if (postData?.dept_name) {
                postData.dept_name = postData?.dept_name.trim();
                const deptCheck = await this.departmentService.findOne({
                    dept_name: postData?.dept_name,
                    deleted: 0,
                    company_id: postData?.company_id,
                    id: Not(postData?.id),
                });
                if (deptCheck) {
                    throw Error(
                      await this.translatorService.frontendReadTranslation(
                            req.lang,
                            'ERR_DEPARTMENT_NAME_EXIST',
                        ),
                    );
                }
            }
            await this.departmentService.update(
                { id: postData?.id },
                {
                    ...postData,
                },
            );
            const deptID = recordDetails?.id;
            let dynamicDatas = Object.create(null);
            if(postData?.dept_name){
                let tilte = `department_name_${deptID}`
                dynamicDatas[`${tilte}`]= postData?.dept_name;
            } 
            if(postData?.dept_desc){
                let tilte = `department_desc_${deptID}`
                dynamicDatas[`${tilte}`]= postData?.dept_desc;
            }
            await this.translatorService.DynamicEngJsonData('OrgAdmin',postData?.company_id,dynamicDatas,'Edit','Department',deptID);
            this.activityLogService.create(recordDetails, postData, tableConstant.COMPANIES.TBL_DEPARTMENT, req.tokenUser?.id);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Department has been updated successfully.',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
    /*
     * Use to delete an department
     * - id and company_id is mandatory params
     */
    @Post('delete')
    async delete(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (!postData?.id || !postData?.company_id) {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_REQUIRED_PARAM_MISSING',
                    ),
                );
            }
            const where = {
                id: postData?.id,
                deleted: 0,
                company_id: postData?.company_id,
            };
            const recordDetails = await this.departmentService.findOne(where);
            if (!recordDetails) {
                throw new Error(
                    await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'ERR_RECORD_NOT_FOUND',
                    ),
                );
            }
            if (recordDetails.default_dept == 'Yes') {
                throw new Error(
                  await this.translatorService.frontendReadTranslation(
                        req.lang,
                        'default department cannot be deleted',
                    ),
                );
            }
            await this.departmentService.update(
                { id: postData?.id },
                {
                    status: 2,
                    deleted: 1,
                },
            );
            await this.translatorService.DynamicEngJsonData('OrgAdmin',postData?.company_id, null,'Delete','Department',recordDetails?.id);
            let defaultDepartment = await this.departmentService.findOne({company_id: postData?.company_id, default_dept: 'Yes', status: Not(2), deleted: 0});
            if(!defaultDepartment){
                defaultDepartment = await this.departmentService.findOne(`department.company_id = ${postData?.company_id} AND department.dept_name LIKE '%_Default%' AND department.status != 2 AND department.deleted = 0`); 
            }
            if(defaultDepartment){
                await this.userService.update({department_id: postData?.id, org_id: postData?.company_id},{department_id: defaultDepartment.id})
            }
            this.activityLogService.create(recordDetails, { status: 0, deleted: 1,}, tableConstant.COMPANIES.TBL_DEPARTMENT, req.tokenUser?.id, 'delete');
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Department has been deleted successfully.',
            });
        } catch (error) {
            this.activityLogService.error_log(req.tokenUser?.id,req?.originalUrl, error?.message, error, req);
            throw new HttpException(
                {
                  statusCode: 401,
                  success: 0,
                  error: 1,
                  message: error?.message,
                  data: null,
                },
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
