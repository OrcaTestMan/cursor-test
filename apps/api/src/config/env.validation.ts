const MIN_ADMIN_PASSWORD_LENGTH = 10;

function readString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** 켜질 때 환경 변수를 검사한다. 문제가 있으면 시작하지 않는다. */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const problems: string[] = [];
  if (!readString(config, 'DATABASE_URL')) {
    problems.push('DATABASE_URL이 설정되지 않았습니다.');
  }
  if (readString(config, 'NODE_ENV') === 'production') {
    if (
      readString(config, 'ADMIN_PASSWORD').length < MIN_ADMIN_PASSWORD_LENGTH
    ) {
      problems.push(
        `운영 환경(NODE_ENV=production)에서는 ADMIN_PASSWORD를 ${MIN_ADMIN_PASSWORD_LENGTH}자 이상으로 설정해야 합니다.`,
      );
    }
    if (!readString(config, 'TEMP_BASIC_AUTH_USER')) {
      problems.push(
        '운영 환경(NODE_ENV=production)에서는 TEMP_BASIC_AUTH_USER를 설정해야 합니다.',
      );
    }
    if (!readString(config, 'TEMP_BASIC_AUTH_PASS')) {
      problems.push(
        '운영 환경(NODE_ENV=production)에서는 TEMP_BASIC_AUTH_PASS를 설정해야 합니다.',
      );
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `환경 변수 설정이 올바르지 않아 서버를 시작할 수 없습니다.\n- ${problems.join('\n- ')}`,
    );
  }
  return config;
}
