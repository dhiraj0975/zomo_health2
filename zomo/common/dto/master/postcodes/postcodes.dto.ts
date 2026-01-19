import { Expose } from 'class-transformer';
export class PostCodesDto {
  @Expose() country: string;
  @Expose() postalcode: string;
  @Expose() city: string;
  @Expose() state: string;
  @Expose() alias: string;
  @Expose() statecode: string;
  @Expose() timezone: string;
}
