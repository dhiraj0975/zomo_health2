import { BaseEntity, PrimaryColumn, Entity, Column } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_NUTR_DEF })
export class NutritionDefEntity extends BaseEntity {
    @PrimaryColumn({ type: 'varchar', length: 4 })
    Nutr_No: string;
    @Column({ type: 'varchar', length: 7 })
    Units: string;
    @Column({ type: 'varchar', length: 20, nullable: true })
    Tagname: string;
    @Column({ type: 'varchar', length: 60 })
    NutrDesc: string;
    @Column({ type: 'varchar', length: 1 })
    Num_Dec: string;
    @Column({ type: 'int' })
    SR_Order: number;
}
