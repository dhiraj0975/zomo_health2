import { BaseEntity, PrimaryColumn, Column, Entity } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_FOOD_DES })
export class FoodDescEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 5 })
    NDB_No: string;
    @Column({ type: 'varchar', length: 4 })
    FdGrp_Cd: string;
    @Column({ type: 'varchar', length: 200 })
    Long_Desc: string;
    @Column({ type: 'varchar', length: 60 })
    Shrt_Desc: string;
    @Column({ type: 'varchar', length: 100, nullable: true })
    ComName: string;
    @Column({ type: 'varchar', length: 65, nullable: true })
    ManufacName: string;
    @Column({ type: 'varchar', length: 1, nullable: true })
    Survey: string;
    @Column({ type: 'varchar', length: 135, nullable: true })
    Ref_desc: string;
    @Column({ type: 'int', nullable: true })
    Refuse: number;
    @Column({ type: 'varchar', length: 65, nullable: true })
    SciName: string;
    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    N_Factor: number;
    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    Pro_Factor: number;
    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    Fat_Factor: number;
    @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
    CHO_Factor: number;
}
