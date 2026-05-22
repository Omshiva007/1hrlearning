import { prisma } from '../utils/prisma';
import { FITMENT, RELATED_CATEGORIES, POINT_CONFIG_KEYS } from '@1hrlearning/shared';
import type { MatchScore } from '@1hrlearning/shared';

/** Check if two skill categories are related for partial match scoring. */
function areRelatedCategories(a: string, b: string): boolean {
  return RELATED_CATEGORIES.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
}

/** Compute reputation score (0–20) from avg rating, session count, and consistency. */
function computeReputation(
  averageRating: number | null,
  totalSessionsTaught: number,
  ratingCount: number,
): number {
  if (!averageRating || ratingCount === 0) return 0;

  // Rating component: 0–12 pts (max at 5 stars)
  const ratingScore = ((averageRating - 1) / 4) * 12;

  // Volume component: 0–5 pts (caps at 50 sessions taught)
  const volumeScore = Math.min(totalSessionsTaught / 50, 1) * 5;

  // Consistency component: 0–3 pts (rating count proxy for reliability)
  const consistencyScore = Math.min(ratingCount / 20, 1) * 3;

  return Math.min(Math.round(ratingScore + volumeScore + consistencyScore), FITMENT.REPUTATION_MAX);
}

async function getMinFitmentScore(): Promise<number> {
  const config = await prisma.pointConfig.findUnique({
    where: { key: POINT_CONFIG_KEYS.MIN_FITMENT_SCORE },
  });
  return config ? config.value : FITMENT.MIN_SCORE_TO_SHOW;
}

export class MatchingService {
  async findMatches(userId: string, limit = 20): Promise<MatchScore[]> {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { skill: true } },
        availability: { where: { status: 'OPEN' }, select: { startTime: true, endTime: true } },
      },
    });

    if (!currentUser) return [];

    const learnSkills = currentUser.skills.filter((s) => s.isLearning);
    const learnSkillIds = learnSkills.map((s) => s.skillId);
    const learnCategories = [...new Set(learnSkills.map((s) => s.skill.category))];

    if (learnCategories.length === 0) return [];

    const minScore = await getMinFitmentScore();

    // Find all users who teach in categories the current user wants to learn
    const candidates = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        isSuspended: false,
        isBanned: false,
        isDiscoverable: true,
        skills: {
          some: {
            isTeaching: true,
            skill: { category: { in: learnCategories } },
          },
        },
      },
      include: {
        skills: {
          where: { isTeaching: true },
          include: { skill: true },
        },
        availability: {
          where: { status: 'OPEN' },
          select: { startTime: true, endTime: true },
        },
      },
      take: 100,
    });

    const myAvailability = currentUser.availability;

    const scored: Array<MatchScore & { _total: number }> = [];

    for (const candidate of candidates) {
      const teachingSkills = candidate.skills.filter((s) => s.isTeaching);
      const teachingCategories = [...new Set(teachingSkills.map((s) => s.skill.category))];

      // ── 1. Topic match (0–50 pts) ───────────────────────────────────────────
      let topicMatch = 0;
      const canTeachMe: typeof teachingSkills = [];

      for (const learnSkill of learnSkills) {
        const exactMatch = teachingSkills.find((ts) => ts.skillId === learnSkill.skillId);
        if (exactMatch) {
          topicMatch = Math.min(topicMatch + FITMENT.TOPIC_EXACT_MATCH, FITMENT.TOPIC_EXACT_MATCH);
          canTeachMe.push(exactMatch);
          continue;
        }
        // Related category partial match
        const relatedMatch = teachingSkills.find((ts) =>
          areRelatedCategories(ts.skill.category, learnSkill.skill.category),
        );
        if (relatedMatch && topicMatch < FITMENT.TOPIC_EXACT_MATCH) {
          topicMatch = Math.max(topicMatch, FITMENT.TOPIC_RELATED_MATCH);
          canTeachMe.push(relatedMatch);
        }
      }

      if (topicMatch === 0) continue; // No topic match at all — skip

      // ── 2. Availability overlap (0–30 pts) ──────────────────────────────────
      let availabilityScore = 0;
      if (myAvailability.length > 0 && candidate.availability.length > 0) {
        let hasFullOverlap = false;
        let hasPartialOverlap = false;

        for (const mySlot of myAvailability) {
          for (const theirSlot of candidate.availability) {
            const overlapStart = Math.max(mySlot.startTime.getTime(), theirSlot.startTime.getTime());
            const overlapEnd = Math.min(mySlot.endTime.getTime(), theirSlot.endTime.getTime());
            if (overlapEnd > overlapStart) {
              const myDuration = mySlot.endTime.getTime() - mySlot.startTime.getTime();
              const overlapDuration = overlapEnd - overlapStart;
              if (overlapDuration >= myDuration * 0.9) {
                hasFullOverlap = true;
              } else {
                hasPartialOverlap = true;
              }
            }
          }
        }

        availabilityScore = hasFullOverlap
          ? FITMENT.AVAILABILITY_FULL_OVERLAP
          : hasPartialOverlap
          ? FITMENT.AVAILABILITY_PARTIAL_OVERLAP
          : 0;
      }
      // When no availability data exists, omit the component (matches still shown based on topic+reputation)

      // ── 3. Reputation (0–20 pts) ────────────────────────────────────────────
      const reputationScore = computeReputation(
        candidate.averageRating,
        candidate.totalSessionsTaught,
        candidate.ratingCount,
      );

      const total = topicMatch + availabilityScore + reputationScore;
      if (total < minScore) continue;

      // Apply reciprocal visibility filter if candidate has it enabled
      if (candidate.reciprocalVisibility) {
        const candidateLearnCategories = await prisma.userSkill
          .findMany({
            where: { userId: candidate.id, isLearning: true },
            include: { skill: { select: { category: true } } },
          })
          .then((skills) => skills.map((s) => s.skill.category));

        const myTeachCategories = currentUser.skills
          .filter((s) => s.isTeaching)
          .map((s) => s.skill.category);

        const hasReciprocal = candidateLearnCategories.some((c) => myTeachCategories.includes(c));
        if (!hasReciprocal) continue;
      }

      const matchedSkills = canTeachMe.map((s) => s.skill);
      const iCanTeach = await prisma.userSkill
        .findMany({
          where: { userId, isTeaching: true, skill: { category: { in: teachingCategories } } },
          include: { skill: true },
        })
        .then((skills) => skills.map((s) => s.skill));

      scored.push({
        userId: candidate.id,
        fitmentScore: total,
        _total: total,
        scoreFactors: {
          topicMatch,
          availabilityOverlap: availabilityScore,
          reputation: reputationScore,
          total,
        },
        user: {
          id: candidate.id,
          username: candidate.username,
          displayName: candidate.displayName,
          bio: candidate.bio,
          avatarUrl: candidate.avatarUrl,
          timezone: candidate.timezone,
          isVerified: candidate.isVerified,
          isDiscoverable: candidate.isDiscoverable,
          defaultSessionDuration: candidate.defaultSessionDuration,
          pointsBalance: candidate.pointsBalance,
          totalSessionsTaught: candidate.totalSessionsTaught,
          totalSessionsLearned: candidate.totalSessionsLearned,
          averageRating: candidate.averageRating,
          ratingCount: candidate.ratingCount,
          createdAt: candidate.createdAt,
          teachingSkills: candidate.skills.filter((s) => s.isTeaching) as never,
          learningSkills: [] as never,
        },
        canTeachMe: matchedSkills,
        iCanTeach,
        matchedSkills,
      });
    }

    return scored
      .sort((a, b) => b._total - a._total)
      .slice(0, limit)
      .map(({ _total, ...rest }) => rest);
  }
}

export const matchingService = new MatchingService();
