export interface RecommendationCandidate {
  id: string;
  name: string;
  causeArea: string;
  city: string | null;
  state: string | null;
  missionStatement: string | null;
  verificationStatus: string;
  charityNavigatorStars: number | null;
  guideStarSealLevel: string | null;
}

export interface RecommendationResult {
  organizationId: string;
  reason: string;
  matchScore: number;
}
