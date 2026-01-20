import { appConstant, CommonArrayService, CommonFileService, CommonService, MarketingCareerDto, MarketingDto } from '@common-constants';
import { Body, Controller, HttpException, HttpStatus, Inject, Post, Req, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import 'dotenv/config';
import { Request, Response } from "express";
import { diskStorage } from 'multer';
import * as path from 'path';
import { lastValueFrom } from 'rxjs';
import { fileName, filesFilter } from 'src/utils/image-upload.utils';
import { MarketingService } from '../marketing/marketing.service';
import { MarketingCareerService } from '../marketing/marketingcareer.service';
import { ActivityLogService } from "../master/activitylog/activitylog.service";
import { TranslationService } from '../translation/translation.service';
@Controller('marketing')
export class MarketingController {
    constructor(
        private readonly commonService: CommonService,
        private readonly commonArrayService: CommonArrayService,
        private readonly commonFileService: CommonFileService,
        private readonly translatorService: TranslationService,
        @Inject('COMMON_SERVICE')
        private commonMicroservice: ClientProxy,
        private readonly marketingService: MarketingService,
        private readonly marketingcareerService: MarketingCareerService,
        private readonly activityLogService: ActivityLogService,
    ) { }
    @Post('market-mail')
    async marketMail(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            if (postData?.subscribe == 1) {
                if (!postData?.toEmail) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            } else {
                if (!postData?.name || !postData?.toEmail || !postData?.company_name) {
                    throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
                }
            }
            if (appConstant.DISPOSABLE_DOMAINS.includes(postData?.toEmail?.split('@')[1]?.toLowerCase())) {
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "Please use a corporate email id."));
            }
            if (postData?.country_code && postData?.contact_number) {
                postData.contact_number = postData?.country_code + ' ' + postData?.contact_number;
            }
            if (postData?.contact_number == '') {
                postData.contact_number = ' Not Provided';
            }
            if (postData?.message == '') {
                postData.message = ' Not Provided';
            }
            let MarketingData = [];
            let where = { email: postData?.toEmail };
            MarketingData['email'] = postData?.toEmail;
            let msg = 'e-mail sent successfully';
            if (postData?.subscribe == 1) {
                MarketingData['subscribe'] = 1;
                msg = 'You have successfully subscribed to our newsletter.';
            } else {
                MarketingData['name'] = postData?.name;
                MarketingData['company'] = postData?.company_name;
                MarketingData['mobile'] = postData?.contact_number;
                MarketingData['message'] = postData?.message;
                let emailDetails = {
                    receiver: 'nima@zomohealth.com',
                    /*receiver: 'sumeet.s@zomohealth.com',*/
                    subject: 'New Enquiry From Marketing Website.',
                    content: { 'type': 50, 'Name': postData?.name, 'Company_Name': postData?.company_name, 'Email': postData?.toEmail, 'Contact_Number': postData?.contact_number, 'Message': postData?.message },
                    template: `<p>You have received a new enquiry from Zomo Health's marketing website, please find the details below.</p>
                        <p>Name :- [Name]</p>
                        <p>Email :- [Email]</p>
                        <p>Company Name :- [Company Name]</p>
                        <p>Contact Number :- [Contact Number]</p>
                        <p>Message :- [Message]</p>`
                }
                await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emailDetails));
            }
            await this.marketingService.createUpdate(where, { ...MarketingData });
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: msg,
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('market-mail-list')
    async marketMailList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = '';   
            if(postData?.subscribe == '1'){
                where += ` marketing.subscribe = 1`;
            } else if (postData?.subscribe == '0'){
                where += ` marketing.subscribe = 0`;
            } else {
                where += ` marketing.subscribe IN (0,1)`;
            }         
            if (postData?.filter_by == 'name') {
                where += ` AND marketing.name LIKE '%${postData?.search_str}%'`;
            } else if (postData?.filter_by == 'email') {
                where += ` AND marketing.email LIKE '%${postData?.search_str}%'`;
            } else if (postData?.filter_by == 'company') {
                where += ` AND marketing.company LIKE '%${postData?.search_str}%'`;
            } else if (postData?.filter_by == 'mobile') {
                where += ` AND marketing.mobile LIKE '%${postData?.search_str}%'`;
            }                                     
            const resultedData = await this.marketingService.paginateList(
                where,
                postData,
            );    
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MarketingDto, resultedData['list'], req.lang)
            );        
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('career-mail')
    @UseInterceptors(
        AnyFilesInterceptor( {
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.MARKETING_CAREER_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        })
    )
    async careerCreate(@Req() req: Request, @Res() res: Response, @Body() postData: any, @UploadedFiles() file: Record<string, any>) {
        try {
            if (!postData?.first_name || !postData?.last_name || !postData?.email || !postData?.role) {
                if (file && Object.keys(file).length > 0) {
                    for(let fileData of Object.keys(file)){
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);  
                    }
                }
                throw new Error(await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING"));
            }            
            if (postData?.country_code && postData?.mobile) {
                postData.mobile = postData?.country_code + ' ' + postData?.mobile;
            }
            let where = { email: postData?.email };
            let careerDetails = await this.marketingcareerService.findOne(where);
            if (careerDetails) {
                return res.status(HttpStatus.OK).json({
                    statusCode: 200,
                    success: 1,
                    error: 0,
                    data: null,
                    message: 'You have already submitted your application.',
                });
            }
            if (postData?.mobile == '') {
                postData.mobile = ' Not Provided';
            }
            let name = postData?.first_name + '_' + postData?.last_name;
            if (file && Object.keys(file).length > 0) {                
                for(let fileData of Object.keys(file)){                    
                    if (file[fileData].fieldname == 'resume_cv' || file[fileData].fieldname == 'supporting_document') {
                        const key = file[fileData].fieldname;
                        const prefix = file[fileData].fieldname == 'resume_cv' ? 'resume' : 'supporting_document';
                        file[fileData].originalname = this.commonFileService.formatFileName(file[fileData].originalname);
                        file[fileData].filename = `marketing_career/${prefix}_${name}.${file[fileData].originalname.split('.')[file[fileData].originalname.split('.').length - 1]}`
                        await lastValueFrom(this.commonMicroservice.send({cmd: 'upload_file'}, {path: path.resolve(file[fileData].path),  filename: file[fileData].filename, contentDispositionType: false}));
                        postData[key] = file[fileData].filename;
                    }
                }
            }
            let attachemnt = [];
            if(postData?.resume_cv){
                let file = postData?.resume_cv;
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: file,  userBucket: 'public'}));
                if(fileData){                                    
                    let filename = file.split('/')[file.split('/').length -1]; 
                    const directory = `${appConstant.MARKETING_CAREER_PATH}`;
                    let filePath = path.join(directory, filename);                    
                    await this.commonFileService.base64ToFileCreate(fileData.Body,filePath);                   
                    attachemnt.push({
                        filename: filename,
                        path: path.resolve(filePath)
                    });                    
                }
            }
            if(postData?.supporting_document){
                let file = postData?.supporting_document;
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: file,  userBucket: 'public'}));
                if(fileData){                                    
                    let filename = file.split('/')[file.split('/').length -1]; 
                    const directory = `${appConstant.MARKETING_CAREER_PATH}`;
                    let filePath = path.join(directory, filename);                    
                    await this.commonFileService.base64ToFileCreate(fileData.Body,filePath);                    
                    attachemnt.push({
                        filename: filename,
                        path: path.resolve(filePath)
                    });                    
                }
            }        
            if (postData?.supporting_document == '') {
                postData.supporting_document = ' Not Provided';
            } 
            let CareerData = [];                  
            CareerData['first_name'] = postData?.first_name;
            CareerData['last_name'] = postData?.last_name;
            CareerData['email'] = postData?.email;
            CareerData['role'] = postData?.role;
            CareerData['mobile'] = postData?.mobile;
            CareerData['resume_cv'] = postData?.resume_cv;
            CareerData['supporting_document'] = postData?.supporting_document;
            let emailDetails = {                
                receiver: 'careers@zomohealth.com',
                /*receiver: 'sumeet.s@zomohealth.com',*/
                subject: `New Application for ${postData?.role}.`,
                content: { 'type': 51, 'cc':'bailey.m@zomohealth.com', 'Name': postData?.first_name +' '+ postData?.last_name ,'Email': postData?.email,'Contact_Number': postData?.mobile,'Role': postData?.role },
                attachment: attachemnt,
                template: `<p>Hello Bailey,</p>
                    <p>We have received a new application for the role of ${postData?.role}</p>
                    <p>Please find the details below:-</p>
                    <p>Name :- [Name]</p> 
                    <p>Email :- [Email]</p>  
                    <p>Contact Number :- [Contact Number]</p>                      
                    <p>Role :- [Role]</p>                
                    <p>You can find the resume & other supporting documents in the attachment.</p>`
            }            
            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emailDetails));     
            await this.marketingcareerService.save(CareerData);
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Application submitted successfully',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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
    @Post('career-mail-list')
    async careerMailList(@Req() req: Request, @Res() res: Response, @Body() postData: any) {
        try {
            postData = this.commonService.sanitizePayload(postData);
            let where = '';                       
            if (postData?.filter_by == 'name') {
                where += ` (marketingcareer.first_name LIKE '%${postData?.search_str}%' OR marketingcareer.last_name LIKE '%${postData?.search_str}%')`;
            } else if (postData?.filter_by == 'email') {
                where += ` marketingcareer.email LIKE '%${postData?.search_str}%'`;
            } else if (postData?.filter_by == 'role') {
                where += ` marketingcareer.role LIKE '%${postData?.search_str}%'`;
            } else if (postData?.filter_by == 'mobile') {
                where += ` marketingcareer.mobile LIKE '%${postData?.search_str}%'`;
            }                                     
            const resultedData = await this.marketingcareerService.paginateList(
                where,
                postData,
            );    
            resultedData['list'] = <any>(
                await this.commonArrayService.formatToDto(MarketingCareerDto, resultedData['list'], req.lang)
            );        
            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: resultedData,
                message: 'success',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id,req?.originalUrl, error?.message, error, req);
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

    @Post('atologist-career-mail')
    @UseInterceptors(
        AnyFilesInterceptor({
            limits: { fileSize: appConstant.FILE_SIZE_10MB },
            storage: diskStorage({
                destination: `${appConstant.ATOLOGIST_CAREER_PATH}`,
                filename: fileName
            }),
            fileFilter: filesFilter
        })
    )
    async atologistCareerCreate(@Req() req: Request, @Res() res: Response, @Body() postData: any, @UploadedFiles() file: Record<string, any>) {
        try {
            const isResumeUploaded = file && Object.values(file).some((f: any) => f.fieldname === 'resume_cv');
            if (!postData?.first_name || !postData?.last_name || !postData?.email || !postData?.role || !isResumeUploaded) {
                if (file && Object.keys(file).length > 0) {
                    for (let fileData of Object.keys(file)) {
                        await this.commonFileService.removeFileFromLocal(`${file[fileData].path}`);
                    }
                }
                const msg = await this.translatorService.frontendReadTranslation(req.lang, "ERR_REQUIRED_PARAM_MISSING");
                throw new Error(msg);
            }
            if (postData?.country_code && postData?.mobile) {
                postData.mobile = postData?.country_code + ' ' + postData?.mobile;
            }
            if (postData?.mobile == '') {
                postData.mobile = ' Not Provided';
            }
            let name = postData?.first_name +  + postData?.last_name;
            if (file && Object.keys(file).length > 0) {
                for (let fileData of Object.keys(file)) {
                    if (file[fileData].fieldname == 'resume_cv' || file[fileData].fieldname == 'supporting_document') {
                        const key = file[fileData].fieldname;

                        const prefix = file[fileData].fieldname == 'resume_cv' ? 'resume' : 'supporting_document';
                        file[fileData].originalname = this.commonFileService.formatFileName(file[fileData].originalname);
                        file[fileData].filename = `atologist/career/${prefix}_${name}.${file[fileData].originalname.split('.')[file[fileData].originalname.split('.').length - 1]}`
                        await lastValueFrom(this.commonMicroservice.send({ cmd: 'upload_file' }, { path: path.resolve(file[fileData].path), filename: file[fileData].filename, contentDispositionType: false }));
                        postData[key] = file[fileData].filename;
                    }
                }
            }
            let attachemnt = [];
            if (postData?.resume_cv) {
                let file = postData?.resume_cv;
                let fileData = await lastValueFrom(this.commonMicroservice.send({ cmd: 'get_file' }, { path: file, userBucket: 'public' }));
                if (fileData) {
                    let filename = file.split('/')[file.split('/').length - 1];
                    const directory = `${appConstant.ATOLOGIST_CAREER_PATH}`;
                    let filePath = path.join(directory, filename);
                    await this.commonFileService.base64ToFileCreate(fileData.Body, filePath);
                    attachemnt.push({
                        filename: filename,
                        path: path.resolve(filePath)
                    });
                }
            }
            if (postData?.supporting_document) {
                let file = postData?.supporting_document;
                let fileData = await lastValueFrom(this.commonMicroservice.send({ cmd: 'get_file' }, { path: file, userBucket: 'public' }));
                if (fileData) {
                    let filename = file.split('/')[file.split('/').length - 1];
                    const directory = `${appConstant.ATOLOGIST_CAREER_PATH}`;
                    let filePath = path.join(directory, filename);
                    await this.commonFileService.base64ToFileCreate(fileData.Body, filePath);
                    attachemnt.push({
                        filename: filename,
                        path: path.resolve(filePath)
                    });
                }
            }
            if (postData?.supporting_document == '') {
                postData.supporting_document = ' Not Provided';
            }

            let emailDetails = {
                receiver: 'hr@atologistinfotech.com',
                subject: `New Application for ${postData?.role}.`,
                content: { 'type': 51, 'Name': postData?.first_name + ' ' + postData?.last_name, 'Email': postData?.email, 'Contact_Number': postData?.mobile, 'Role': postData?.role },
                attachment: attachemnt,
                template: `<p>Hello Team,</p>
                    <p>We have received a new application for Atologist for the role of ${postData?.role}</p>
                    <p>Please find the details below:-</p>
                    <p>Name :- [Name]</p> 
                    <p>Email :- [Email]</p>  
                    <p>Contact Number :- [Contact Number]</p>                      
                    <p>Role :- [Role]</p>                
                    <p>You can find the resume & other supporting documents in the attachment.</p>`
            }
            await lastValueFrom(this.commonMicroservice.send({ cmd: 'send_email' }, emailDetails));

            return res.status(HttpStatus.OK).json({
                statusCode: 200,
                success: 1,
                error: 0,
                data: null,
                message: 'Application submitted to Atologist successfully',
            });
        } catch (error) {
            this.activityLogService.error_log(req?.tokenUser?.id, req?.originalUrl, error?.message, error, req);
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
