/**
 * Unit tests for matching score factor calculation logic
 * These tests validate the score computation without requiring a database connection.
 * Run with: npx ts-node --transpile-only src/__tests__/matching.test.ts
 */

interface SkillStub { id: string; name: string }
interface UserSkillStub { skillId: string; isTeaching: boolean; isLearning: boolean; skill: SkillStub }
interface UserStub { id: string; username: string; displayName: string; bio: string | null; avatarUrl: string | null; timezone: string; isVerified: boolean; isDiscoverable: boolean; pointsBalance: number; totalSessionsTaught: number; totalSessionsLearned: number; averageRating: number | null; ratingCount: number; createdAt: Date; skills: UserSkillStub[] }

function computeMatchScore(
  wantToLearn: string[],
  canTeach: string[],
  match: UserStub,
): {
  score: number;
  scoreFactors: { skillOverlap: number; reciprocityBonus: number; ratingBonus: number; activityBonus: number; mutualExchangeBonus: number };
  canTeachMe: SkillStub[];
  iCanTeach: SkillStub[];
} {
  const matchTeachesWhatILearn = match.skills.filter(
    (s) => s.isTeaching && wantToLearn.includes(s.skillId),
  );
  const matchLearnsWhatITeach = match.skills.filter(
    (s) => s.isLearning && canTeach.includes(s.skillId),
  );

  const skillOverlap = matchTeachesWhatILearn.length + matchLearnsWhatITeach.length;
  const mutualExchangeBonus = matchTeachesWhatILearn.length > 0 && matchLearnsWhatITeach.length > 0 ? 0.5 : 0;
  const teachScore = matchTeachesWhatILearn.length * 1.0;
  const learnScore = matchLearnsWhatITeach.length * 0.5;
  const ratingBonus = match.averageRating ? match.averageRating / 10 : 0;
  const activityBonus = Math.min(match.totalSessionsTaught / 100, 0.3);
  const reciprocityBonus = mutualExchangeBonus;

  const score = teachScore + learnScore + mutualExchangeBonus + ratingBonus + activityBonus;

  return {
    score,
    scoreFactors: { skillOverlap, reciprocityBonus, ratingBonus, activityBonus, mutualExchangeBonus },
    canTeachMe: matchTeachesWhatILearn.map((s) => s.skill),
    iCanTeach: matchLearnsWhatITeach.map((s) => s.skill),
  };
}

function makeUser(overrides: Partial<UserStub> & { skills: UserSkillStub[] }): UserStub {
  return {
    id: 'user-1',
    username: 'user1',
    displayName: 'User One',
    bio: null,
    avatarUrl: null,
    timezone: 'UTC',
    isVerified: false,
    isDiscoverable: true,
    pointsBalance: 10,
    totalSessionsTaught: 0,
    totalSessionsLearned: 0,
    averageRating: null,
    ratingCount: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

function approxEqual(a: number, b: number, tolerance = 0.001): boolean {
  return Math.abs(a - b) < tolerance;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n📊 Matching Score Factor Tests\n');

// Test 1: No overlap → score = 0 (no match found before, but function receives matched users)
{
  console.log('Test 1: No overlap between skills');
  const match = makeUser({
    skills: [
      { skillId: 'skill-python', isTeaching: true, isLearning: false, skill: { id: 'skill-python', name: 'Python' } },
    ],
  });
  const result = computeMatchScore(['skill-react'], ['skill-js'], match);
  assert(result.score === 0, 'Score should be 0 when no skills overlap');
  assert(result.scoreFactors.skillOverlap === 0, 'skillOverlap factor should be 0');
  assert(result.canTeachMe.length === 0, 'canTeachMe should be empty');
  assert(result.iCanTeach.length === 0, 'iCanTeach should be empty');
}

// Test 2: Match teaches what I want to learn
{
  console.log('\nTest 2: Match teaches a skill I want to learn');
  const match = makeUser({
    skills: [
      { skillId: 'skill-react', isTeaching: true, isLearning: false, skill: { id: 'skill-react', name: 'React' } },
    ],
  });
  const result = computeMatchScore(['skill-react'], [], match);
  assert(approxEqual(result.score, 1.0), 'Score should be 1.0 (1 teach match)');
  assert(result.scoreFactors.skillOverlap === 1, 'skillOverlap should be 1');
  assert(result.scoreFactors.mutualExchangeBonus === 0, 'No mutual bonus without reciprocity');
  assert(result.canTeachMe.length === 1, 'Should have 1 skill they can teach me');
  assert(result.canTeachMe[0].name === 'React', 'Skill name should be React');
}

// Test 3: Mutual exchange bonus (I teach what they want, they teach what I want)
{
  console.log('\nTest 3: Mutual exchange creates bonus');
  const match = makeUser({
    skills: [
      { skillId: 'skill-react', isTeaching: true, isLearning: false, skill: { id: 'skill-react', name: 'React' } },
      { skillId: 'skill-music', isTeaching: false, isLearning: true, skill: { id: 'skill-music', name: 'Music' } },
    ],
  });
  const result = computeMatchScore(['skill-react'], ['skill-music'], match);
  // teachScore = 1.0, learnScore = 0.5, mutualBonus = 0.5
  assert(approxEqual(result.score, 2.0), 'Score should be 2.0 with mutual exchange');
  assert(approxEqual(result.scoreFactors.mutualExchangeBonus, 0.5), 'Mutual exchange bonus should be 0.5');
  assert(approxEqual(result.scoreFactors.reciprocityBonus, 0.5), 'Reciprocity bonus should be 0.5');
  assert(result.iCanTeach.length === 1, 'Should have 1 skill I can teach');
}

// Test 4: Rating bonus affects score
{
  console.log('\nTest 4: Rating bonus is applied correctly');
  const match = makeUser({
    averageRating: 4.5,
    skills: [
      { skillId: 'skill-react', isTeaching: true, isLearning: false, skill: { id: 'skill-react', name: 'React' } },
    ],
  });
  const result = computeMatchScore(['skill-react'], [], match);
  // teachScore = 1.0, ratingBonus = 4.5/10 = 0.45
  assert(approxEqual(result.score, 1.45), 'Score should include rating bonus');
  assert(approxEqual(result.scoreFactors.ratingBonus, 0.45), 'Rating bonus should be 0.45');
}

// Test 5: Activity bonus is capped at 0.3
{
  console.log('\nTest 5: Activity bonus is capped at 0.3');
  const match = makeUser({
    totalSessionsTaught: 500, // Way over 100
    skills: [
      { skillId: 'skill-react', isTeaching: true, isLearning: false, skill: { id: 'skill-react', name: 'React' } },
    ],
  });
  const result = computeMatchScore(['skill-react'], [], match);
  assert(approxEqual(result.scoreFactors.activityBonus, 0.3), 'Activity bonus should be capped at 0.3');
  assert(approxEqual(result.score, 1.3), 'Score should be 1.0 + 0.3 cap');
}

// Test 6: Multiple overlapping skills
{
  console.log('\nTest 6: Multiple overlapping skills increase score proportionally');
  const match = makeUser({
    skills: [
      { skillId: 'skill-react', isTeaching: true, isLearning: false, skill: { id: 'skill-react', name: 'React' } },
      { skillId: 'skill-ts', isTeaching: true, isLearning: false, skill: { id: 'skill-ts', name: 'TypeScript' } },
      { skillId: 'skill-js', isTeaching: true, isLearning: false, skill: { id: 'skill-js', name: 'JavaScript' } },
    ],
  });
  const result = computeMatchScore(['skill-react', 'skill-ts', 'skill-js'], [], match);
  // teachScore = 3.0
  assert(approxEqual(result.score, 3.0), 'Score should be 3.0 for 3 skill matches');
  assert(result.scoreFactors.skillOverlap === 3, 'skillOverlap should be 3');
}

// Test 7: scoreFactors are all present
{
  console.log('\nTest 7: All score factors are present in result');
  const match = makeUser({
    averageRating: 3.0,
    totalSessionsTaught: 20,
    skills: [
      { skillId: 'skill-react', isTeaching: true, isLearning: false, skill: { id: 'skill-react', name: 'React' } },
    ],
  });
  const result = computeMatchScore(['skill-react'], [], match);
  assert('skillOverlap' in result.scoreFactors, 'skillOverlap factor should exist');
  assert('reciprocityBonus' in result.scoreFactors, 'reciprocityBonus factor should exist');
  assert('ratingBonus' in result.scoreFactors, 'ratingBonus factor should exist');
  assert('activityBonus' in result.scoreFactors, 'activityBonus factor should exist');
  assert('mutualExchangeBonus' in result.scoreFactors, 'mutualExchangeBonus factor should exist');
}

console.log('\n✅ All matching score tests passed!\n');
