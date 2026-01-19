import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
    @MessagePattern({ cmd: 'test' })
    test() {
      return true;
    }
}
