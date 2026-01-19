import { Injectable } from '@nestjs/common';
import * as fs from "fs";
import { ActivityLogService } from 'src/activitylog/activitylog.service';
import Mailer from './mailer/mailer.service';
@Injectable()
export class EmailService {
  constructor(
        private readonly activityLogService: ActivityLogService,
    ) {
    }
  sendEmail = async (sender_email: string, target_email: string, Subject: string, emailDetails: any, templateContent: string, attachment: any = null) => {
    try {
      const email = target_email.toLowerCase();
      const emailRegex = /^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,3})$/i;
      let emails 
      if (typeof email === "string" && email.trim() !== "") {
        emails = email.split(",");
      } else {
        return;
      }
      emails.forEach((singleEmail) => {
        singleEmail = singleEmail.trim();
        if (singleEmail == '' || !emailRegex.test(singleEmail) || singleEmail.includes('@yopmail.com') || singleEmail.includes('@mailinator.com')) {
          return;
        }
      });
      const cc_email = emailDetails?.cc?.toLowerCase() || '';
      let cc_emails = []
      if (cc_email && cc_email != '') {
        if (typeof cc_email === "string" && cc_email.trim() !== "") {
          cc_emails = cc_email.split(",");
        } else {
          //cc email is undefined
          return;
        }
        cc_emails.forEach((singleEmail) => {
          singleEmail = singleEmail.trim();
          if (singleEmail == '' || !emailRegex.test(singleEmail) || singleEmail.includes('@yopmail.com') || singleEmail.includes('@mailinator.com')) {
            return;
          }
        });
      }
      if (!sender_email || sender_email == '') {
        sender_email = `Zomo Health<noreply@${process.env.DOMAIN}>`;
      }
      let type = (emailDetails?.type) ? emailDetails.type : 0;
      templateContent = templateContent.replace(/\[/g, '{{');
      templateContent = templateContent.replace(/\]/g, '}}');
      let replaceDatas = Object.create(null);
      if (type == 34 || type == 33 || type == 32) { /* Relay Race Skip Turn Email */
        replaceDatas = {
          '{{First Name}}': emailDetails.name,
          '{{Team Name}}': emailDetails.team_name,
          '{{RACER #1}}': emailDetails.racer1,
          '{{RACER #2}}': emailDetails.racer2,
          "{{Company Name}}": emailDetails.company_name,
        }
      } else if (type == 4) { /* team meber invite */
        replaceDatas = {
          '{{First Name}}': emailDetails.name,
          '{{Team Name}}': emailDetails.team_name,
          '{{Challenge Name}}': emailDetails.challenge_name,
          '{{Challenge Start Date}}': emailDetails.challenge_start_date,
          '{{Challenge End Date}}': emailDetails.challenge_end_date,
          '{{Registration Start Date}}': emailDetails.registration_start_date,
          '{{Registration End Date}}': emailDetails.registration_end_date,
          '{{Invited User}}': emailDetails.invitor_user,
          "{{Company Name}}": emailDetails.company_name,
        }
      } else if (type == 20) { /* forgot username */
        replaceDatas = {
          '{{First Name}}': emailDetails.name,
          '{{Username}}': emailDetails.username,
          '{{Company Name}}': emailDetails.company_name,
        }
      } else if (type == 25) { /* spouse registration */
        replaceDatas = {
          '{{First Name}}': emailDetails.firstName,
          '{{Username}}': emailDetails.userName,
          '{{Password}}': emailDetails.password,
          '{{Company Name}}': emailDetails.companyName,
          '{{Name}}': emailDetails.name,
        }
      }  else if (type == 7) { /* forgot password */
        replaceDatas = {
          '{{First Name}}': emailDetails.name,
          '{{Reset Link}}': emailDetails.reset_link,
          '{{Company Name}}': emailDetails.company_name,
        }
      } else if (type == 30 || type == 31) { /* accept or decline form */
        replaceDatas = {
          '{{Username}}': emailDetails.username,
          '{{Link}}': emailDetails.link,
          '{{Image}}': emailDetails.image,
          '{{Form}}': emailDetails.form,
        }
      } else if (type == 9) {
        replaceDatas = {
          '{{First Name}}': emailDetails?.firstName || '',
          '{{Username}}': emailDetails.Username,
          '{{Password}}': emailDetails.Password,
          "{{Company Name}}": emailDetails.CompanyName,
        }
      } else if (type == 8) { /* event registration */
        replaceDatas = {
          '{{First Name}}': emailDetails.name,
          '{{Event Name}}': emailDetails.event_name,
          '{{Event date}}': emailDetails.event_date,
          '{{Slot Start time}}': emailDetails.start_time,
          '{{Slot End time}}': emailDetails.end_time,
          '{{Event Time Zone}}': emailDetails.timezone,
          '{{Preferred Language}}': emailDetails.prefered_language,
          '{{Calendar File Link}}': emailDetails?.calendar_link ?? '',
        }
      } else if (type == 24) {
        replaceDatas = {
          '{{First Name}}': emailDetails.First_Name,
          '{{Company Name}}': emailDetails.Company_Name,
          '{{Link}}': emailDetails.Link,
        }
      } else if (type == 15) {
        replaceDatas = {
          '{{First Name}}': emailDetails.First_Name,
          '{{Company Name}}': emailDetails.Company_Name,
          '{{Username}}': emailDetails.Username,
          '{{Password}}': emailDetails.Password,
        }
      } else if (type == 50) {
        replaceDatas = {
          '{{Name}}': emailDetails.Name,
          '{{Email}}': emailDetails.Email,
          '{{Company Name}}': emailDetails.Company_Name,
          '{{Contact Number}}': emailDetails.Contact_Number,
          '{{Message}}': emailDetails.Message,
        }
      } else if (type == 51) {
        replaceDatas = {
          '{{Name}}': emailDetails.Name,
          '{{Email}}': emailDetails.Email,
          '{{Contact Number}}': emailDetails.Contact_Number,
          '{{Role}}': emailDetails.Role,
        }
      } else if (type == 6 || type == 42 || type == 13 || type == 18 || type == 14 || type == 43) {
        replaceDatas = {
          '{{First Name}}': emailDetails.First_Name,
          '{{Company Name}}': emailDetails.Company_Name,
        }
      } else if (type == 1 ){ /* create account */
        replaceDatas = {
          '{{First Name}}': emailDetails['First Name'],
          '{{Username}}': emailDetails.Username,
          '{{Password}}': emailDetails.Password,
          '{{Company Name}}': emailDetails['Company Name'],
          '{{Company Text}}': emailDetails['Company Text'],
          '{{dynamic_text}}': emailDetails.dynamicText,
        }
      } else if (type == 5 ){ /* create account */
        replaceDatas = {
          '{{First Name}}': emailDetails['First Name'],
          '{{User Name}}': emailDetails.Username,
          '{{Password}}': emailDetails.Password,
          '{{Company Name}}': emailDetails['Company Name'],
          '{{Company Text}}': emailDetails['Company Text'],
          '{{dynamic_text}}': emailDetails.dynamicText,
        }
      } else if (type == 19 ){ /* reset password email */
        replaceDatas = {
          '{{First Name}}': emailDetails['First Name'],
          '{{Username}}': emailDetails.Username,
          '{{Password}}': emailDetails.Password,
          '{{Company Name}}': emailDetails['Company Name'],
          '{{dynamic_text}}': emailDetails.dynamicText,
        }
      } else if (type == 21 || type == 35){ /* user record update */
        replaceDatas = {
          '{{First Name}}': emailDetails['First Name'],
          '{{Company Name}}': emailDetails['Company Name'],
        }
      } else if (type == 2 ){ /* spouse invite */
        replaceDatas = {
          '{{First Name}}': emailDetails['First Name'],
          '{{Name}}': emailDetails['Name'],
          '{{Activation Link}}': emailDetails['Activation Link'],
        }
      } else if (type == 88){ /* Report */
        replaceDatas = {
          '{{Full Name}}': emailDetails['full_name'],
          '{{First Name}}': emailDetails['first_name'],
          '{{Report Items Name}}': emailDetails['report_items_name'],
          '{{Company Name}}': emailDetails['company_name'],
          '{{Company Logo}}': emailDetails['company_logo'],
        }
      } else if (type == 26 || type == 11){
        replaceDatas = {
          '{{First Name}}': emailDetails['orgAdminName']          
        }
      } else if (type == 40){
        replaceDatas = {
          '{{Full Name}}': emailDetails['full_name'],
          '{{Dynamic Text}}': emailDetails['dynamictext'],
          '{{Company Name}}': emailDetails['company_name'],
        }
      }
      else if (type == 44){ /* Mass comunication mail */
        replaceDatas = {
          '{{First Name}}': emailDetails['first_name'],
          '{{Campaign Name}}': emailDetails['campaign_name'],
          '{{Event Name}}': emailDetails['event_name'],
          '{{Company Name}}': emailDetails['company_name'],
          '{{Company Logo}}': emailDetails['company_logo'],
        }
      }
      else if (type == 28){ /* Decline health form mail */
        replaceDatas = {
          '{{Username}}': emailDetails['Username'],
          '{{Link}}': emailDetails['Link'],
          '{{Form}}': emailDetails['Form'],
          '{{Image}}': emailDetails['Image'],
        }
      }
      else if (type == 27) { /* Covid failed form mail */
        replaceDatas = {
          '{{User Code}}': emailDetails['usercode'],
          '{{Name}}': emailDetails['name'],
          '{{Email}}': emailDetails['email'],
        }
      }
      else if (type == 41){ // survey fail mail
        replaceDatas = {
          '{{User Code}}': emailDetails['usercode'],
          '{{Name}}': emailDetails['name'],
          '{{Email}}': emailDetails['email'],
          '{{dynamic_text}}': emailDetails['dynamicText'],
        }
      }
      for (let key in replaceDatas) {
        templateContent = templateContent.replace(new RegExp(key, 'g'), replaceDatas[key]);
      }
      if(templateContent.includes('https://preventioncloud.com/users/users/login')){
        templateContent = templateContent.replace(new RegExp('https://preventioncloud.com/users/users/login', 'g'), `https://${process.env.DOMAIN}/login`);
      }
      if(templateContent.includes('https://demoaws.preventioncloud.com/users/users/login')){
        templateContent = templateContent.replace(new RegExp('https://demoaws.preventioncloud.com/users/users/login', 'g'), `https://${process.env.DOMAIN}/login`);
      }
      if(templateContent.includes('PreventionCloud')){
        templateContent = templateContent.replace(new RegExp('PreventionCloud', 'g'), `Zomo Health`);
      }
      if(templateContent.includes('support@zomohealth.com')){
        templateContent = templateContent.replace(new RegExp('support@zomohealth.com', 'g'), `support@zomohealth.com`);
      }

      if(templateContent.includes('IMAGE_BASE_URL')){
        const userDomain = 'https://' + process.env.DOMAIN;
        templateContent = templateContent.replace(/{{IMAGE_BASE_URL}}/g, userDomain);
      }

      let html = templateContent;
      let mailObject = {
          receiver_email: target_email,
          sender_email: sender_email,
          cc: emailDetails?.cc || "",
          subject: Subject,
      };
      let emailData = await Mailer.sendEmail(
        mailObject,
        html,
        attachment
      );
      if(emailData?.error){
        this.activityLogService.error_log(target_email,JSON.stringify({...mailObject,html}), emailData?.message, emailData?.errordata, attachment);
      }
      if (attachment) {
        if(!Array.isArray(attachment)){
          attachment = [attachment];
        }
        for(let element of attachment){
          if (element && element.path) {
            if (fs.existsSync(element.path)) {
              fs.unlinkSync(element.path);
            }
          }
        }
      }
      return emailData;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}