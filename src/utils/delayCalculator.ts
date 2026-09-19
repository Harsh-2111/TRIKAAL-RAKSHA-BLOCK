export interface SectionDelays {
  passengerDelayMins: number;
  freightDelayMins: number;
}

export function calculateSectionDelays(durationMins: number, sectionName?: string): SectionDelays {
  void sectionName;
  const safeDuration = Math.max(0, durationMins || 0);

  return {
    passengerDelayMins: Math.round(safeDuration * 0.2),
    freightDelayMins: Math.round(safeDuration * (25 / 60)),
  };
}