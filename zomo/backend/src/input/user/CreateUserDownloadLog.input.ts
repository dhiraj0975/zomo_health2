
import { Allow } from 'class-validator';

export class CreateUserDownloadLogInput {
  @Allow() user_id: number;
  @Allow() email: string;
  @Allow() metadata: string;
}
