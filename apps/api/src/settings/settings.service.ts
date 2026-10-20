import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { DbService } from '../db/db.service.js';
import { settings } from '../db/schema.js';
import { AuditService } from '../moderation/audit.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

const SETTINGS_ID = 1;

const publicSettingsColumns = {
  siteName: settings.siteName,
  noticeBanner: settings.noticeBanner,
  signupEnabled: settings.signupEnabled,
  postApprovalRequired: settings.postApprovalRequired,
  bestThreshold: settings.bestThreshold,
  freeTags: settings.freeTags,
  matchTags: settings.matchTags,
  humorTags: settings.humorTags,
  reviewTags: settings.reviewTags,
  newsTags: settings.newsTags,
};

const settingsColumns = {
  ...publicSettingsColumns,
  reportHideThreshold: settings.reportHideThreshold,
  postCooldownSec: settings.postCooldownSec,
  commentCooldownSec: settings.commentCooldownSec,
};

export type PublicSettings = {
  siteName: string;
  noticeBanner: string;
  signupEnabled: boolean;
  postApprovalRequired: boolean;
  bestThreshold: number;
  freeTags: string[];
  matchTags: string[];
  humorTags: string[];
  reviewTags: string[];
  newsTags: string[];
};

export type Settings = PublicSettings & {
  reportHideThreshold: number;
  postCooldownSec: number;
  commentCooldownSec: number;
};

@Injectable()
export class SettingsService implements OnApplicationBootstrap {
  constructor(
    private readonly dbService: DbService,
    private readonly auditService: AuditService,
  ) {}

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

  async getPublic(): Promise<PublicSettings> {
    const {
      siteName,
      noticeBanner,
      signupEnabled,
      postApprovalRequired,
      bestThreshold,
      freeTags,
      matchTags,
      humorTags,
      reviewTags,
      newsTags,
    } = await this.get();
    return {
      siteName,
      noticeBanner,
      signupEnabled,
      postApprovalRequired,
      bestThreshold,
      freeTags,
      matchTags,
      humorTags,
      reviewTags,
      newsTags,
    };
  }

  async getModeration() {
    await this.ensureRow();
    const [row] = await this.dbService.db
      .select({
        bestThreshold: settings.bestThreshold,
        reportHideThreshold: settings.reportHideThreshold,
        postCooldownSec: settings.postCooldownSec,
        commentCooldownSec: settings.commentCooldownSec,
        freeTags: settings.freeTags,
        matchTags: settings.matchTags,
        humorTags: settings.humorTags,
        reviewTags: settings.reviewTags,
        newsTags: settings.newsTags,
      })
      .from(settings)
      .where(eq(settings.id, SETTINGS_ID));
    return row;
  }

  async update(admin: AuthUser, dto: UpdateSettingsDto): Promise<Settings> {
    await this.ensureRow();
    const before = await this.get();
    const [row] = await this.dbService.db
      .update(settings)
      .set({
        siteName: dto.siteName,
        noticeBanner: dto.noticeBanner,
        signupEnabled: dto.signupEnabled,
        postApprovalRequired: dto.postApprovalRequired,
        bestThreshold: dto.bestThreshold,
        freeTags: dto.freeTags,
        matchTags: dto.matchTags,
        humorTags: dto.humorTags,
        reviewTags: dto.reviewTags,
        newsTags: dto.newsTags,
        reportHideThreshold: dto.reportHideThreshold,
        postCooldownSec: dto.postCooldownSec,
        commentCooldownSec: dto.commentCooldownSec,
      })
      .where(eq(settings.id, SETTINGS_ID))
      .returning(settingsColumns);
    const changed = (Object.keys(row) as (keyof Settings)[]).filter(
      (key) => JSON.stringify(before[key]) !== JSON.stringify(row[key]),
    );
    await this.auditService.log(
      admin,
      'settings.update',
      'settings',
      null,
      changed.length > 0 ? `바뀐 항목: ${changed.join(', ')}` : '바뀐 항목 없음',
    );
    return row;
  }
}
