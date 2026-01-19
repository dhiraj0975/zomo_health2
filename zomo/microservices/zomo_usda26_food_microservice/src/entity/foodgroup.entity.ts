import { BaseEntity, PrimaryColumn, Column, Entity } from 'typeorm';
import { tableConstant } from '../constant';
@Entity({ name: tableConstant.TBL_FD_GROUP })
export class FoodGroupEntity extends BaseEntity {
    @PrimaryColumn({
        type: 'varchar',
        length: 4,
    })
    FdGrp_Cd: string;
    @Column({ type: 'varchar', length: 60 })
    FdGrp_Desc: string;
}
