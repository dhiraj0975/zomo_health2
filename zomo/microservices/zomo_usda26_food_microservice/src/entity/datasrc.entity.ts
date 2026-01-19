import { Entity, Column, BaseEntity, PrimaryColumn } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_DATA_SRC })
export class DataSrcEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 6 })
    DataSrc_ID: string;
    @Column('varchar', { length: 255, nullable: true })
    Authors: string;
    @Column('varchar', { length: 255, nullable: true })
    Title: string;
    @Column('varchar', { length: 4, nullable: true })
    Year: string;
    @Column('varchar', { length: 135, nullable: true })
    Journal: string;
    @Column('varchar', { length: 16, nullable: true })
    Vol_City: string;
    @Column('varchar', { length: 5, nullable: true })
    Issue_State: string;
    @Column('varchar', { length: 5, nullable: true })
    Start_Page: string;
    @Column('varchar', { length: 5, nullable: true })
    End_Page: string;
}
