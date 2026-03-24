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
  // Design
  { name: 'UI Design', category: 'Design', description: 'Designing user interfaces and experiences' },
  { name: 'Figma', category: 'Design', description: 'Collaborative interface design tool' },
  { name: 'Graphic Design', category: 'Design', description: 'Visual communication and design' },
  // Business
  { name: 'Project Management', category: 'Business', description: 'Planning and executing projects' },
  { name: 'Digital Marketing', category: 'Business', description: 'Online marketing strategies and tools' },
  { name: 'SEO', category: 'Business', description: 'Search engine optimization techniques' },
  // Language
  { name: 'English', category: 'Language', description: 'English language communication' },
  { name: 'Spanish', category: 'Language', description: 'Spanish language communication' },
  { name: 'French', category: 'Language', description: 'French language communication' },
  // Music
  { name: 'Guitar', category: 'Music', description: 'Acoustic and electric guitar' },
  { name: 'Piano', category: 'Music', description: 'Piano and keyboard playing' },
  // Art
  { name: 'Drawing', category: 'Art', description: 'Freehand drawing and sketching' },
  { name: 'Photography', category: 'Photography', description: 'Digital and film photography' },
  // Finance
  { name: 'Personal Finance', category: 'Finance', description: 'Budgeting, investing, and financial planning' },
  // Fitness
  { name: 'Yoga', category: 'Fitness', description: 'Yoga practice and techniques' },
  { name: 'Cooking', category: 'Cooking', description: 'Cooking techniques and recipes' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

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
      },
    });

    // Give admin an initial points balance transaction
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

  for (const skillData of INITIAL_SKILLS) {
    const slug = slugify(skillData.name);
    const existing = await prisma.skill.findFirst({
      where: { OR: [{ name: { equals: skillData.name, mode: 'insensitive' } }, { slug }] },
    });

    if (!existing) {
      await prisma.skill.create({
        data: {
          name: skillData.name,
          slug,
          description: skillData.description,
          category: skillData.category,
          isApproved: true,
        },
      });
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ Skills seeded: ${created} created, ${skipped} already existed`);
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
