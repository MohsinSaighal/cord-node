import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

@Entity("referral_data")
@Index(["referrerId", "referredUserId"], { unique: true })
@Index(["code"], { unique: true })
export class ReferralData {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  code!: string;

  @Column({ type: "decimal", precision: 15, scale: 8, default: 0 })
  totalEarnings!: number;

  @Column({ type: "integer", default: 0 })
  totalReferrals!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @Column({ type: "uuid" })
  referrerId!: string;

  @Column({ type: "uuid" })
  referredUserId!: string;

  @ManyToOne(() => User, (user) => user.referrals, { onDelete: "CASCADE" })
  @JoinColumn({ name: "referrerId" })
  referrer!: User;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "referredUserId" })
  referredUser!: User;
}