import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AppService } from './app.service';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @MessagePattern({ cmd: 'create_log' })
  createLog(postData: any) {
    try {
      return this.appService.create(postData);
    } catch (error) {
      console.log("error",error);
      let data = {user_id: 0,end_point: 'create/logError', message: 'CreateLogError', log: `${JSON.stringify(postData)}`, req: JSON.stringify(postData) }
      this.appService.error_log(data);
    }

    return this.appService.create(postData);
  }
  @MessagePattern({ cmd: 'create_multiple_log' })
  createMultipleLog(postData: any) {
    try {
      return this.appService.createMultiple(postData);
    } catch (error) {
      console.log("error",error);
      let data = {user_id: 0,end_point: 'create/multipleLogError', message: 'CreateMultipleLogError', log: `${JSON.stringify(postData)}`, req: JSON.stringify(postData) }
      this.appService.error_log(data);
    }

    return this.appService.create(postData);
  }
  @MessagePattern({ cmd: 'error_log' })
  errorLog(postData: any) {
    try {
      return this.appService.error_log(postData);
    } catch (error) {
      console.log("error",error);
    }
  }
  @MessagePattern({ cmd: 'email_log' })
  emailLog(postData: any) {
    try {
      return this.appService.email_log(postData);
    } catch (error) {
      console.log("error",error);
    }
  }

  @MessagePattern({ cmd: 'test' })
  test() {
    return true;
  }
}
