import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
} from "typeorm";
import { UserTask } from "./UserTask";
import { MiningSession } from "./MiningSession";
import { UserSettings } from "./UserSettings";
import { UserEpochStats } from "./UserEpochStats";
import { ReferralData } from "./ReferralData";

@Entity("users")
@Index(["username"], { unique: true })
@Index(["referralCode"], { unique: true })
export class User {
  // Direct mappings from CSV
  @PrimaryColumn({ type: "varchar", length: 228 })
  id!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  username!: string;

  @Column({ type: "varchar", length: 10 })
  discriminator!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  avatar!: string;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0 })
  account_age!: number;

  @Column({ type: "timestamp with time zone" })
  join_date!: Date;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 1.0 })
  multiplier!: number;

  @Column({ type: "decimal", precision: 20, scale: 8 })
  total_earned!: number;

  @Column({ type: "numeric", precision: 15, scale: 2, default: 0 })
  current_balance!: number;

  @Column({ type: "boolean", default: false })
  is_node_active!: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  node_start_time!: Date | null;

  @Column({ type: "integer", default: 0 })
  tasks_completed!: number;

  @Column({ type: "integer", default: 0 })
  rank!: number;

  @Column({ type: "timestamp with time zone" })
  last_login_time!: Date;

  @Column({ type: "boolean", default: false })
  daily_checkin_claimed!: boolean;

  @Column({ type: "boolean", default: false, nullable: true })
  isNodeActive!: boolean;

  @Column({ type: "numeric", precision: 15, scale: 2, default: 0 })
  weekly_earnings!: number;

  @Column({ type: "numeric", precision: 15, scale: 2, default: 0 })
  monthly_earnings!: number;

  @Column({
    type: "varchar",
    length: 50,
    nullable: true,
    unique: true,
    name: "referral_code", // This matches your database column name
  })
  referralCode!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  referred_by!: string | null;

  @Column({ type: "numeric", precision: 15, scale: 2, default: 0 })
  referral_earnings!: number;

  @Column({ type: "integer", default: 0 })
  total_referrals!: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;

  @Column({ type: "varchar", length: 100, nullable: true })
  current_epoch_id!: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  epoch_join_date!: Date | null;

  @Column({ type: "numeric", precision: 15, scale: 2, default: 0 })
  total_epoch_earnings!: number;

  @Column({ type: "numeric", precision: 15, scale: 2, default: 0 })
  lifetime_referral_earnings!: number;

  @Column({ type: "timestamp with time zone", nullable: true })
  last_referral_payout!: Date | null;

  @Column({ type: "boolean", default: false })
  compensation_claimed!: boolean;

  @Column({ type: "boolean", name: "hasbadgeofhonor", default: false })
  hasbadgeofhonor!: boolean;

  @Column({ type: "bigint", default: 0, nullable: true })
  lastSavedBalance!: number;

  @Column({ type: "bigint", nullable: true })
  nodeStartTime!: number; // Stores the milliseconds directly
  // Relations (unchanged)
  @OneToMany(() => UserTask, (userTask) => userTask.user)
  userTasks!: UserTask[];

  @OneToMany(() => MiningSession, (session) => session.user)
  miningSessions!: MiningSession[];

  @OneToOne(() => UserSettings, (settings) => settings.user)
  settings!: UserSettings;

  @OneToMany(() => UserEpochStats, (epochStats) => epochStats.user)
  epochStats!: UserEpochStats[];

  @OneToMany(() => ReferralData, (referral) => referral.referrer)
  referrals!: ReferralData[];

  // Helper methods for conversion if needed
  getAccountAge(): number {
    return this.account_age;
  }

  getJoinDate(): Date {
    return this.join_date;
  }

  // Add other getters as needed
}
