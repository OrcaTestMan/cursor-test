import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { settings } from '../db/schema.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

const SETTINGS_ID = 1;

const settingsColumns = {
  siteName: settings.siteName,
  noticeBanner: settings.noticeBanner,
  signupEnabled: settings.signupEnabled,
  postApprovalRequired: settings.postApprovalRequired,
};

export type Settings = {
  siteName: string;
  noticeBanner: string;
  signupEnabled: boolean;
  postApprovalRequired: boolean;
};

@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  constructor(private readonly dbService: DbService) {}

  async onApplicationBootstrap() {
    await this.ensureRow();
  }

  private async ensureRow() {
    await this.dbService.db
      .insert(settings)
      .values({ id: SETTINGS_ID })
      .onConflictDoNothing();
  }

  async get(): Promise<Settings> {
    const [row] = await this.dbService.db
      .select(settingsColumns)
      .from(settings)
      .where(eq(settings.id, SETTINGS_ID));
    if (row) {
      return row;
    }
    await this.ensureRow();
    return this.get();
  }

  async update(dto: UpdateSettingsDto): Promise<Settings> {
    await this.ensureRow();
    const [row] = await this.dbService.db
      .update(settings)
      .set({
        siteName: dto.siteName,
        noticeBanner: dto.noticeBanner,
        signupEnabled: dto.signupEnabled,
        postApprovalRequired: dto.postApprovalRequired,
      })
      .where(eq(settings.id, SETTINGS_ID))
      .returning(settingsColumns);
    return row;
  }
}
