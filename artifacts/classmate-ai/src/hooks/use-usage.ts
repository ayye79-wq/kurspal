export function useUsage(_isServerPremium?: boolean) {
  const isPremium = () => true;
  const canExplain = () => true;
  const explainCount = () => 0;
  const remainingExplains = () => 999;
  const incrementExplain = () => 0;
  const isNearLimit = () => false;
  const DAILY_LIMIT = 999;

  return {
    isPremium,
    canExplain,
    explainCount,
    remainingExplains,
    incrementExplain,
    isNearLimit,
    DAILY_LIMIT,
  };
}
