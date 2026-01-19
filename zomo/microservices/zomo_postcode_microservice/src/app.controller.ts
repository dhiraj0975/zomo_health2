import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { In } from "typeorm";
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern({ cmd: 'find_postcode' })
  findPostcode(postData: any) {
    try{
      if(postData[0] && postData[0]['countrycode'] == 'US') {
        for (let i = 0; i < postData?.length; i++) {
          let obj = postData[i];
          for (let key in obj) {
              if (key && !['countrycode'].includes(key)) {
                postData[i][key] = In(obj[key] as any[]);
              }
          }
        }
        return this.appService.getPostalCodeUS(postData);
      } else if(postData[0] && postData[0]['countrycode'] == 'CA') {
        let status = 0;
        if (postData[0].hasOwnProperty('status') && postData[0]['status']) {
          status = 1;
          delete postData[0]['status'];
        }
        for (let i = 0; i < postData?.length; i++) {
          let obj = postData[i];
          for (let key in obj) {
            if (key && !['countrycode'].includes(key)) {
              postData[i][key] = In(obj[key] as any[]);
            }
          }
        }
        return this.appService.getPostalCodeCA(postData, status);
      } else {
        return this.appService.getTimezone(postData);
      }
    }catch (error) {
        throw new Error(error.message); 
    }
  }

  @MessagePattern({ cmd: 'state_list' })
  stateList(postData: any) {
    try{
      let whereCondition = '';
      if(postData[0] && postData[0]['countrycode'] == 'US') {
        whereCondition = `us_post_codes.countrycode = 'US'`;
        if(postData[0]?.['statecode']){
          whereCondition += ` AND (us_post_codes.state = '${postData[0]['statecode']}' OR us_post_codes.statecode = '${postData[0]['statecode']}')`
        }
        if(postData[0]?.['state']){
          whereCondition += ` AND (us_post_codes.state IN ('${postData[0]['state']}') OR us_post_codes.statecode IN ('${postData[0]['state']}'))`
        }
      }
      if(postData[0] && postData[0]['countrycode'] == 'CA') {
        whereCondition = `ca_post_codes.countrycode = 'CA'`;
        if(postData[0]?.['statecode']){
          whereCondition += ` AND (ca_post_codes.province = '${postData[0]['statecode']}' OR ca_post_codes.provincecode = '${postData[0]['statecode']}')`
        }
        if(postData[0]?.['state']){
          whereCondition += ` AND (ca_post_codes.province IN ('${postData[0]['state']}') OR ca_post_codes.provincecode IN ('${postData[0]['state']}'))`
        }
      }
      return this.appService.getStateList(whereCondition, postData[0]['countrycode']);
    }catch (error) {
        throw new Error(error.message); 
    }
  }

  @MessagePattern({ cmd: 'city_list' })
  cityList(postData: any) {
    try{
      let whereCondition = '';
      if(postData[0] && postData[0]['countrycode'] == 'US') {
        whereCondition = `us_post_codes.countrycode = 'US'`;
        if(postData[0]?.['statecode']){
          whereCondition += ` AND (us_post_codes.state = '${postData[0]['statecode']}' OR us_post_codes.statecode = '${postData[0]['statecode']}')`
        }
      }
      if(postData[0] && postData[0]['countrycode'] == 'CA') {
        whereCondition = `ca_post_codes.countrycode = 'CA'`;
        if(postData[0]?.['statecode']){
          whereCondition += ` AND (ca_post_codes.province = '${postData[0]['statecode']}' OR ca_post_codes.provincecode = '${postData[0]['statecode']}')`
        }
      }
      return this.appService.getCityList(whereCondition, postData[0]['countrycode']);
    }catch (error) {
        throw new Error(error.message); 
    }
  }

  @MessagePattern({ cmd: 'test' })
  test() {
    return true;
  }
}
