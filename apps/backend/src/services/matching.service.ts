import { prisma } from '../utils/prisma';
import type { MatchScore } from '@1hrlearning/shared';

export class MatchingService {
  async findMatches(userId: string, limit = 10): Promise<MatchScore[]> {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { skills: { include: { skill: true } } },
    });

    if (!currentUser) return [];

    const wantToLearn = currentUser.skills.filter((s) => s.isLearning).map((s) => s.skillId);
    const canTeach = currentUser.skills.filter((s) => s.isTeaching).map((s) => s.skillId);

    if (wantToLearn.length === 0 && canTeach.length === 0) return [];

    const potentialMatches = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isActive: true,
        skills: {
          some: {
            OR: [
              { skillId: { in: wantToLearn }, isTeaching: true },
              { skillId: { in: canTeach }, isLearning: true },
            ],
          },
        },
      },
      include: {
        skills: { include: { skill: true } },
      },
      take: 50,
    });

    const scored: MatchScore[] = potentialMatches.map((match) => {
      const matchTeachesWhatILearn = match.skills.filter(
        (s) => s.isTeaching && wantToLearn.includes(s.skillId),
      );
      const matchLearnsWhatITeach = match.skills.filter(
        (s) => s.isLearning && canTeach.includes(s.skillId),
      );

      const mutualExchangeBonus = matchTeachesWhatILearn.length > 0 && matchLearnsWhatITeach.length > 0 ? 0.5 : 0;
      const teachScore = matchTeachesWhatILearn.length * 1.0;
      const learnScore = matchLearnsWhatITeach.length * 0.5;
      const ratingBonus = match.averageRating ? match.averageRating / 10 : 0;
      const activityBonus = Math.min(match.totalSessionsTaught / 100, 0.3);

      const score = teachScore + learnScore + mutualExchangeBonus + ratingBonus + activityBonus;
      const matchedSkills = [
        ...matchTeachesWhatILearn.map((s) => s.skill),
        ...matchLearnsWhatITeach.map((s) => s.skill),
      ];

      return {
        userId: match.id,
        user: {
          id: match.id,
          username: match.username,
          displayName: match.displayName,
          bio: match.bio,
          avatarUrl: match.avatarUrl,
          timezone: match.timezone,
          isVerified: match.isVerified,
          pointsBalance: match.pointsBalance,
          totalSessionsTaught: match.totalSessionsTaught,
          totalSessionsLearned: match.totalSessionsLearned,
          averageRating: match.averageRating,
          ratingCount: match.ratingCount,
          createdAt: match.createdAt,
          teachingSkills: match.skills.filter((s) => s.isTeaching) as never,
          learningSkills: match.skills.filter((s) => s.isLearning) as never,
        },
        score,
        matchedSkills,
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}

export const matchingService = new MatchingService();
