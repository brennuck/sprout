export function calculateGoalImpact(
  funded: number,
  impactSpend: number,
  target: number | null,
  monthlyTarget: number | null,
) {
  return {
    progress: target ? Math.max(0, Math.min(100, (funded / target) * 100)) : null,
    hypotheticalTargetPercent: target ? (impactSpend / target) * 100 : null,
    estimatedDelayDays:
      monthlyTarget && monthlyTarget > 0
        ? Math.ceil((impactSpend / monthlyTarget) * 30)
        : null,
    noImpactEquivalent: funded + impactSpend,
  };
}
