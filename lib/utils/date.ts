/**
 * 날짜/시간 유틸리티
 */

/**
 * 타임스탬프를 상대적 시간 문자열로 변환
 * @param timestamp - Unix timestamp (밀리초)
 * @returns 상대적 시간 문자열 (예: "방금 전", "어제", "3일 전")
 */
export function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return '어제';
  } else if (days < 7) {
    return `${days}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }
}

/**
 * 현재 타임스탬프 반환
 */
export function now(): number {
  return Date.now();
}

