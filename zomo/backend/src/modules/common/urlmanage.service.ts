import { appConstant } from '@common-constants';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { DocumentService } from '../datamanagement/document/document.service';
import DeviceDetector = require('device-detector-js');
@Injectable()
export class UrlManageService {
    constructor(
            private readonly documentService: DocumentService,
            @Inject('COMMON_SERVICE')
            private commonMicroservice: ClientProxy,
    ) { }

    async onmapUrl(url: string | null){
        try{
            let userDomain = 'https://'+process.env.DOMAIN;
            let adminDomain = 'https://'+process.env.ADMINDOMAIN;
            let replaceDomain = '';
            let domains = appConstant.DOMAINS_LIST;
            if (url?.includes(`${domains[0]}`)) {
                if (url?.includes(`${domains[1]}`)) {
                    url = url.replace(`${domains[1]}`, adminDomain);
                    replaceDomain = adminDomain;
                }else{
                    url = url.replace(`${domains[0]}`, userDomain);
                    replaceDomain = userDomain;
                }
            }else if (url?.includes(`${domains[2]}`)) {
                if (url?.includes(`${domains[3]}`)) {
                    url = url.replace(`${domains[3]}`, adminDomain);
                    replaceDomain = adminDomain;
                }else{
                    url = url.replace(`${domains[2]}`, userDomain);
                    replaceDomain = userDomain;
                }
            }else if (url?.includes(`${domains[4]}`)) {
                if (url?.includes(`${domains[5]}`)) {
                    url = url.replace(`${domains[5]}`, adminDomain);
                    replaceDomain = adminDomain;
                }else{
                    url = url.replace(`${domains[4]}`, userDomain);
                    replaceDomain = userDomain;
                }
            }else if (url?.includes(`${domains[6]}`)) {
                url = url.replace(`${domains[6]}`, userDomain);
                replaceDomain = userDomain;
            }else if (url?.includes(`${domains[7]}`)) {
                url = url.replace(`${domains[7]}`, adminDomain);
                replaceDomain = adminDomain;
            }else if (url?.includes(`${domains[8]}`)) {
                url = url.replace(`${domains[8]}`, userDomain);
                replaceDomain = userDomain;
            }else if (url?.includes(`${domains[9]}`)) {
                url = url.replace(`${domains[9]}`, adminDomain);
                replaceDomain = adminDomain;
            }else if (url?.includes(`${domains[10]}`)) {
                url = url.replace(`${domains[10]}`, userDomain);
                replaceDomain = userDomain;
            }else if (url?.includes(`${domains[11]}`)) {
                url = url.replace(`${domains[11]}`, adminDomain);
                replaceDomain = adminDomain;
            }
            
            if(url?.includes('documentmanagement/documentmanagement/downloads/')){
                let expoUrl = url.split('documentmanagement/documentmanagement/downloads/');
                let gId = expoUrl?.[1] || '';
                let dgId = decodeURIComponent(gId);
                let ngId = Buffer.from(dgId, 'base64').toString('utf-8'); // "6574"
                let checkDocument = await this.documentService.findOne({ id: ngId });
                if(checkDocument){
                    if(checkDocument.is_login == 0){
                        url =  url.replace('documentmanagement/documentmanagement/downloads/', `documentmanagement/documentmanagement/sdownloads/`);
                        url =  url.replace(gId, `15/${ngId}`);
                    }else{
                        url =  url.replace(gId, `15/${ngId}`);
                    }
                }else{
                    url =  url.replace(gId, `15/${ngId}`);
                }
            }
            if(url?.includes('documentmanagement/documentmanagement/org_file_download/')){
                let expoUrl = url.split('documentmanagement/documentmanagement/org_file_download/');
                let gId = expoUrl?.[1] || '';
                let dgId = decodeURIComponent(gId);
                let ngId = Buffer.from(dgId, 'base64').toString('utf-8'); // "6574"
                let checkDocument = await this.documentService.findOne({ id: ngId });
                if(checkDocument){
                    if(checkDocument.is_login == 0){
                        url =  url.replace('documentmanagement/documentmanagement/org_file_download/', `documentmanagement/documentmanagement/sdownloads/`);
                        url =  url.replace(gId, `15/${ngId}`);
                    }else{
                        url =  url.replace(gId, `15/${ngId}`);
                    }
                }else{
                    url =  url.replace(gId, `15/${ngId}`);
                }
            }
            if(url?.includes('emotionalwellbeing/emotionalwellbeing/emotional_categories/')){
                let expoUrl = url.split('emotionalwellbeing/emotionalwellbeing/emotional_categories/');
                let gId = expoUrl?.[1] || '';
                let dgId = decodeURIComponent(gId);
                let ngId = Buffer.from(dgId, 'base64').toString('utf-8'); // "6574"
                url =  url.replace('/'+gId, `?CAT=${ngId}`);
            }
            if(url?.includes('media/media/media_fod_detail/')){
                let expoUrl = url.split('media/media/media_fod_detail/');
                let gId = expoUrl?.[1] || '';
                let dgId = decodeURIComponent(gId);
                let ngId = Buffer.from(dgId, 'base64').toString('utf-8'); // "6574"
                url =  url.replace(gId, `${ngId}`);
            }
            if(url?.includes('hra/emotionalassessments/assessment_steps/')){
                let expoUrl = url.split('hra/emotionalassessments/assessment_steps/');
                let gId = expoUrl?.[1] || '';
                url =  url.replace(gId, `?questionId=${gId}`);
            }
            if(url?.includes('hra/assessments/step/')){
                let expoUrl = url.split('hra/assessments/step/');
                let gId = expoUrl?.[1] || '';
                url =  url.replace('/'+gId, `?questionId=${gId}`);
            }
            if (url?.includes('events/categories') || url?.includes('events/events/index/')) {
                const originalUrl  = new URL(url);
                const parts =  originalUrl.pathname.split("/").filter(segment => /^\d+$/.test(segment));
                if (parts.length == 2) {
                    originalUrl.hash = parts[parts.length - 1];
                }
                const match = originalUrl.pathname.match(/\d+/);
                const categoryId = match ? match[0] : null;
                const eventId = originalUrl.hash.replace(/\D/g, "");
                if (url?.includes('events/categories') && !url?.includes('#event_details')) {
                    url = `${originalUrl.origin}/events`;
                } else if (eventId && categoryId) {
                    url = `${originalUrl.origin}/events/category?category_id=${categoryId}&eventId=${eventId}`;
                } else if (eventId) {
                    url = `${originalUrl.origin}/events?eventId=${eventId}`;
                } else if (categoryId) {
                    url = `${originalUrl.origin}/events/category?category_id=${categoryId}`;
                }
            }
            if(url?.includes('media/media/media_categories/')){
                let expoUrl = url.split('media/media/media_categories/');
                let gId = expoUrl?.[1] || '';
                let dgId = decodeURIComponent(gId);
                let ngId = Buffer.from(dgId, 'base64').toString('utf-8'); // "6574"
                url =  url.replace('/'+gId, `?CAT=${ngId}`);
            }
            let furl:any = url;
            if(replaceDomain != ''){
                let expoUrl = url.split(replaceDomain);
                let checkalue = expoUrl?.[1] || '';
                if(checkalue.includes('documentmanagement/documentmanagement/downloads/')){
                    checkalue = 'documentmanagement/documentmanagement/downloads';
                }
                if(checkalue.includes('documentmanagement/documentmanagement/org_file_download/')){
                    checkalue = 'documentmanagement/documentmanagement/org_file_download';
                }
                if(checkalue.includes('documentmanagement/documentmanagement/sdownloads/')){
                    checkalue = 'documentmanagement/documentmanagement/sdownloads';
                }
                if(checkalue.includes('media/media/media_categories')){
                    checkalue = 'media/media/media_categories';
                }
                if(checkalue.includes('media/media/media_fod_detail/')){
                    checkalue = 'media/media/media_fod_detail';
                }
                if(checkalue.includes('emotionalwellbeing/emotionalwellbeing/emotional_categories')){
                    checkalue = 'emotionalwellbeing/emotionalwellbeing/emotional_categories';
                }
                if(checkalue.includes('hra/emotionalassessments/assessment_steps/')){
                    checkalue = 'hra/emotionalassessments/assessment_steps';
                }
                if(checkalue.includes('hra/assessments/step')){
                    checkalue = 'hra/assessments/step';
                }
                if(checkalue.includes('events/events/index')){
                    checkalue = 'events/events/index';
                }
                let fileData = await lastValueFrom(this.commonMicroservice.send({cmd: 'get_file'}, {path: `common/url/allurl.json`, userBucket: 'private'}));
                let newSystemUrls: any = fileData?.Body ? JSON.parse(Buffer.from(fileData?.Body, 'base64').toString('utf-8')) : {};
                if(newSystemUrls[checkalue]){
                    furl = url.replace(checkalue, newSystemUrls[checkalue]);
                }
            }
            return furl;
        }
        catch(error) {
            throw new Error(error.message);
        }
    }
    async onmapUrlContent(content: string | null | undefined, type = '', admin = 0) {
        try{
            if (!content) return ''; 
            let userDomain = 'https://'+ process.env.DOMAIN;
            let adminDomain = 'https://'+ process.env?.ADMINDOMAIN ;
            let domains = appConstant.DOMAINS_LIST;
            if(type == 'mailTemplate'){
                domains.push('{{IMAGE_BASE_URL}}');
            }
            // Create one regex pattern to match all domains
            const pattern = new RegExp(
                '(' +
                domains
                    .map(domain => domain.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')) // Escape special characters
                    .join('|') +
                ')',
                'gi'
            );
            content = content.replace(pattern, userDomain);
            const sitePattern = new RegExp(
                '(' +
                 '{{SITE_URL}}'.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')  +
                ')',
                'gi'
            );
            if(admin){
                content = content.replace(sitePattern, adminDomain)
            }
            else{
                content = content.replace(sitePattern, userDomain)
            }
            return content
        }
        catch(error) {
            throw new Error(error.message);
        }
    }
}
