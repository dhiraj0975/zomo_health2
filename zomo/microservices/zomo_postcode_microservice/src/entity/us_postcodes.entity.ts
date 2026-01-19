import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_US_TIMEZONES })
export class USPostCodesEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id: number;
  @Column('text', { nullable: true })
  countrycode: string;
  @Column('integer', { nullable: true })
  zipcode: number;
  @Column('text', { nullable: true })
  city: string;
  @Column('text', { nullable: true })
  cityalias: string;
  @Column('text', { nullable: true })
  country: string;
  @Column('text', { nullable: true })
  'country-fips': string;
  @Column('text', { nullable: true })
  state: string;
  @Column('text', { nullable: true })
  statecode: string;
  @Column('text', { nullable: true })
  'state-fips': string;
  @Column('text', { nullable: true })
  timezone: string;
  @Column('text', { nullable: true })
  daylightsaving: string;
  @Column({type: "decimal", precision: 10, scale: 9, default: 0})
  latitude: number;
  @Column({type: "decimal", precision: 10, scale: 7, default: 0})
  longitude: number;
  @Column('integer', { nullable: true })
  zone_id: number;
}
