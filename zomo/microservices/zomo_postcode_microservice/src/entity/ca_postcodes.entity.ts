import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_CA_TIMEZONES })
export class CAPostCodesEntity extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'int' })
  id: number;
  @Column('text', { nullable: true })
  countrycode: string;
  @Column('text', { nullable: true })
  postalcode: string;
  @Column('text', { nullable: true })
  city: string;
  @Column('text', { nullable: true })
  province: string;
  @Column('text', { nullable: true })
  provincecode: string;
  @Column('text', { nullable: true })
  timezone: string;
  @Column('text', { nullable: true })
  daylightsaving: string;
  @Column({type: "decimal", precision: 13, scale: 9, default: 0})
  latitude: number;
  @Column({type: "decimal", precision: 13, scale: 9, default: 0})
  longitude: number;
  @Column('integer', { nullable: true })
  zone_id: number;
}
