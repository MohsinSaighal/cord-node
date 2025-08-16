import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { UserEpochStats } from "./UserEpochStats";

@Entity("epochs")
@Index(["epochNumber"], { unique: true })
@Index(["isActive"])
export class Epoch {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "integer", unique: true, name: "epoch_number" })
  epochNumber!: number;

  @Column({ type: "varchar", length: 255, name: "name" })
  name!: string;

  @Column({ type: "text", name: "description" })
  description!: string;

  @Column({ type: "timestamp", name: "start_date" })
  startDate!: Date;

  @Column({ type: "timestamp", name: "end_date" })
  endDate!: Date;

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive!: boolean;

  @Column({ 
    type: "decimal", 
    precision: 10, 
    scale: 2, 
    default: 1.0,
    name: "rewards_multiplier"
  })
  rewardsMultiplier!: number;

  @Column({ type: "text", nullable: true, name: "special_features" })
  specialFeatures?: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @Column({ type: "boolean", default: false, name: "hasbadgeofhonor" })
  hasbadgeofhonor!: boolean;

  // Relations
  @OneToMany(() => UserEpochStats, (userEpochStats) => userEpochStats.epoch)
  userStats!: UserEpochStats[];

  // Computed properties
  get daysRemaining(): number {
    const now = new Date();
    const end = new Date(this.endDate);
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  get progressPercentage(): number {
    const now = new Date();
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  }
}