import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const INITIAL_SKILLS = [
  // Technology
  { name: 'JavaScript', category: 'Technology', description: 'Dynamic programming language for web development' },
  { name: 'TypeScript', category: 'Technology', description: 'Typed superset of JavaScript' },
  { name: 'Python', category: 'Technology', description: 'Versatile programming language for AI, web, and scripting' },
  { name: 'React', category: 'Technology', description: 'JavaScript library for building user interfaces' },
  { name: 'Node.js', category: 'Technology', description: 'JavaScript runtime for server-side development' },
  { name: 'SQL', category: 'Technology', description: 'Structured Query Language for databases' },
  { name: 'Docker', category: 'Technology', description: 'Containerization platform' },
  { name: 'Git', category: 'Technology', description: 'Version control system' },
  { name: 'Machine Learning', category: 'Technology', description: 'AI and machine learning fundamentals' },
  { name: 'GraphQL', category: 'Technology', description: 'Query language for APIs' },
  { name: 'Rust', category: 'Technology', description: 'Systems programming language focused on safety' },
  { name: 'DevOps', category: 'Technology', description: 'Development operations and CI/CD practices' },
  // Design
  { name: 'UI Design', category: 'Design', description: 'Designing user interfaces and experiences' },
  { name: 'Figma', category: 'Design', description: 'Collaborative interface design tool' },
  { name: 'Graphic Design', category: 'Design', description: 'Visual communication and design' },
  { name: 'UX Research', category: 'Design', description: 'User experience research methods' },
  // Business
  { name: 'Project Management', category: 'Business', description: 'Planning and executing projects' },
  { name: 'Digital Marketing', category: 'Business', description: 'Online marketing strategies and tools' },
  { name: 'SEO', category: 'Business', description: 'Search engine optimization techniques' },
  { name: 'Public Speaking', category: 'Business', description: 'Effective public speaking and presentation' },
  // Language
  { name: 'English', category: 'Language', description: 'English language communication' },
  { name: 'Spanish', category: 'Language', description: 'Spanish language communication' },
  { name: 'French', category: 'Language', description: 'French language communication' },
  { name: 'Japanese', category: 'Language', description: 'Japanese language communication' },
  // Music
  { name: 'Guitar', category: 'Music', description: 'Acoustic and electric guitar' },
  { name: 'Piano', category: 'Music', description: 'Piano and keyboard playing' },
  { name: 'Music Theory', category: 'Music', description: 'Fundamentals of music theory' },
  // Art
  { name: 'Drawing', category: 'Art', description: 'Freehand drawing and sketching' },
  { name: 'Photography', category: 'Photography', description: 'Digital and film photography' },
  { name: 'Video Editing', category: 'Art', description: 'Video editing and post-production' },
  // Finance
  { name: 'Personal Finance', category: 'Finance', description: 'Budgeting, investing, and financial planning' },
  { name: 'Investing', category: 'Finance', description: 'Investment strategies and portfolio management' },
  // Fitness
  { name: 'Yoga', category: 'Fitness', description: 'Yoga practice and techniques' },
  { name: 'Cooking', category: 'Cooking', description: 'Cooking techniques and recipes' },
  { name: 'Mindfulness', category: 'Mindfulness', description: 'Mindfulness and meditation practices' },
  // Writing
  { name: 'Creative Writing', category: 'Writing', description: 'Fiction, storytelling, and creative expression' },
  { name: 'Technical Writing', category: 'Writing', description: 'Writing technical documentation and guides' },
  // Science
  { name: 'Data Science', category: 'Science', description: 'Data analysis, visualization, and interpretation' },
  { name: 'Statistics', category: 'Mathematics', description: 'Statistical analysis and probability' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface SeedUser {
  email: string;
  username: string;
  displayName: string;
  bio: string;
  teachSkills: string[];
  learnSkills: string[];
  pointsBalance: number;
  isDiscoverable: boolean;
}

const SAMPLE_USERS: SeedUser[] = [
  {
    email: 'alice@example.com',
    username: 'alice_dev',
    displayName: 'Alice Chen',
    bio: 'Full-stack developer passionate about React and TypeScript. Learning music theory on the side.',
    teachSkills: ['React', 'TypeScript', 'JavaScript'],
    learnSkills: ['Piano', 'Music Theory'],
    pointsBalance: 25,
    isDiscoverable: true,
  },
  {
    email: 'bob@example.com',
    username: 'bob_designer',
    displayName: 'Bob Martinez',
    bio: 'UX designer with 5 years of experience. Want to learn coding to bring my designs to life.',
    teachSkills: ['Figma', 'UI Design', 'UX Research'],
    learnSkills: ['React', 'JavaScript'],
    pointsBalance: 20,
    isDiscoverable: true,
  },
  {
    email: 'carol@example.com',
    username: 'carol_music',
    displayName: 'Carol Thompson',
    bio: 'Classical pianist and music teacher. Interested in digital marketing to grow my studio.',
    teachSkills: ['Piano', 'Music Theory', 'Guitar'],
    learnSkills: ['Digital Marketing', 'SEO'],
    pointsBalance: 30,
    isDiscoverable: true,
  },
  {
    email: 'david@example.com',
    username: 'david_data',
    displayName: 'David Kim',
    bio: 'Data scientist at a fintech company. Would love to improve my Spanish.',
    teachSkills: ['Python', 'Data Science', 'Machine Learning', 'Statistics'],
    learnSkills: ['Spanish', 'Public Speaking'],
    pointsBalance: 15,
    isDiscoverable: true,
  },
  {
    email: 'emma@example.com',
    username: 'emma_lang',
    displayName: 'Emma Dubois',
    bio: 'French native, fluent in English and Spanish. Learning tech skills to transition into product management.',
    teachSkills: ['French', 'Spanish', 'English'],
    learnSkills: ['Project Management', 'SQL'],
    pointsBalance: 18,
    isDiscoverable: true,
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Create master admin user
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@1hrlearning.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@1hrLearning2024!';
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';

  const existingAdmin = await prisma.user.findFirst({
    where: { OR: [{ email: adminEmail }, { username: adminUsername }] },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        displayName: 'System Admin',
        passwordHash,
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
        pointsBalance: 9999,
        defaultMeetingProvider: 'ZOOM',
        defaultMeetingUrl: 'https://zoom.us/j/10000000001',
      },
    });

    await prisma.pointTransaction.create({
      data: {
        userId: admin.id,
        type: 'BONUS',
        amount: 9999,
        balanceAfter: 9999,
        description: 'Admin initial balance',
      },
    });

    console.log(`✅ Admin user created: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ⚠️  Change this password after first login!');
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  // Seed initial skills
  let created = 0;
  let skipped = 0;

  const skillMap: Record<string, string> = {};

  for (const skillData of INITIAL_SKILLS) {
    const slug = slugify(skillData.name);
    const existing = await prisma.skill.findFirst({
      where: { OR: [{ name: { equals: skillData.name, mode: 'insensitive' } }, { slug }] },
    });

    if (!existing) {
      const skill = await prisma.skill.create({
        data: {
          name: skillData.name,
          slug,
          description: skillData.description,
          category: skillData.category,
          isApproved: true,
        },
      });
      skillMap[skillData.name] = skill.id;
      created++;
    } else {
      skillMap[skillData.name] = existing.id;
      skipped++;
    }
  }

  console.log(`✅ Skills seeded: ${created} created, ${skipped} already existed`);

  // Seed sample users
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    let usersCreated = 0;
    const samplePassword = await bcrypt.hash('Password123!', 12);

    for (const userData of SAMPLE_USERS) {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email: userData.email }, { username: userData.username }] },
      });

      if (!existing) {
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            username: userData.username,
            displayName: userData.displayName,
            bio: userData.bio,
            passwordHash: samplePassword,
            isVerified: true,
            isActive: true,
            isDiscoverable: userData.isDiscoverable,
            pointsBalance: userData.pointsBalance,
            averageRating: 4.5 + Math.random() * 0.5,
            ratingCount: Math.floor(Math.random() * 10) + 1,
            totalSessionsTaught: Math.floor(Math.random() * 20),
            totalSessionsLearned: Math.floor(Math.random() * 15),
            defaultMeetingProvider: 'ZOOM',
            defaultMeetingUrl: `https://zoom.us/j/${String(Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000)}`,
          },
        });

        // Add teaching skills
        for (const skillName of userData.teachSkills) {
          if (skillMap[skillName]) {
            await prisma.userSkill.upsert({
              where: { userId_skillId: { userId: user.id, skillId: skillMap[skillName] } },
              create: {
                userId: user.id,
                skillId: skillMap[skillName],
                level: 'INTERMEDIATE',
                isTeaching: true,
                isLearning: false,
                yearsOfExperience: Math.floor(Math.random() * 5) + 1,
              },
              update: { isTeaching: true },
            });
          }
        }

        // Add learning skills
        for (const skillName of userData.learnSkills) {
          if (skillMap[skillName]) {
            await prisma.userSkill.upsert({
              where: { userId_skillId: { userId: user.id, skillId: skillMap[skillName] } },
              create: {
                userId: user.id,
                skillId: skillMap[skillName],
                level: 'BEGINNER',
                isTeaching: false,
                isLearning: true,
              },
              update: { isLearning: true },
            });
          }
        }

        // Award initial points transaction
        await prisma.pointTransaction.create({
          data: {
            userId: user.id,
            type: 'BONUS',
            amount: userData.pointsBalance,
            balanceAfter: userData.pointsBalance,
            description: 'Welcome bonus + activity rewards',
          },
        });

        usersCreated++;
      }
    }

    if (usersCreated > 0) {
      console.log(`✅ Sample users created: ${usersCreated} (password: Password123!)`);

      // Create a sample public session for discovery testing
      const aliceUser = await prisma.user.findFirst({ where: { username: 'alice_dev' } });
      const reactSkill = await prisma.skill.findFirst({ where: { name: 'React' } });

      if (aliceUser && reactSkill) {
        const existingSession = await prisma.session.findFirst({
          where: { teacherId: aliceUser.id, isPublic: true },
        });

        if (!existingSession) {
          await prisma.session.create({
            data: {
              teacherId: aliceUser.id,
              skillId: reactSkill.id,
              scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
              durationMinutes: 60,
              isPublic: true,
              sessionType: 'TEACHING',
              maxLearners: 1,
              meetingUrl: 'https://zoom.us/j/10000000002',
              notes: 'Intro to React hooks and state management. No prior React experience needed, just basic JavaScript.',
              applicationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            },
          });
          console.log('✅ Sample public session created for discovery testing');
        }
      }
    } else {
      console.log('ℹ️  Sample users already exist');
    }
  }

  console.log('🌱 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
