import { AppDataSource } from "../data-source";
import { UserSettings } from "../entities/UserSettings";
import { Repository } from "typeorm";

export class SettingsService {
  private settingsRepository: Repository<UserSettings>;

  constructor() {
    this.settingsRepository = AppDataSource.getRepository(UserSettings);
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    return await this.settingsRepository.findOne({
      where: { userId },
    });
  }

  async createDefaultSettings(userId: string): Promise<UserSettings> {
    const defaultSettings = {
      userId,
      notifications: {
        mining: true,
        tasks: true,
        referrals: true,
        system: false,
      },
      privacy: {
        showProfile: true,
        showEarnings: false,
        showActivity: true,
      },
      mining: {
        autoStart: false,
        intensity: "medium",
        offlineEarnings: "8h",
      },
      display: {
        theme: "dark",
        language: "en",
        currency: "CORD",
      },
    };

    const settings = this.settingsRepository.create(defaultSettings);
    return await this.settingsRepository.save(settings);
  }

  async updateUserSettings(
    userId: string,
    settingsData: Partial<UserSettings>
  ): Promise<UserSettings | null> {
    let settings = await this.getUserSettings(userId);

    if (!settings) {
      // Create default settings first
      settings = await this.createDefaultSettings(userId);
    }

    // Update the settings
    Object.assign(settings, settingsData);
    return await this.settingsRepository.save(settings);
  }

  async getOrCreateSettings(userId: string): Promise<UserSettings> {
    let settings = await this.getUserSettings(userId);

    if (!settings) {
      settings = await this.createDefaultSettings(userId);
    }

    return settings;
  }
}