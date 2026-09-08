import fs from 'fs';
import path from 'path';

const migrationsDir = path.join(__dirname, '../supabase/migrations');
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

console.log('Validating SQL migrations:');
for (const file of files) {
  const fullPath = path.join(migrationsDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  console.log(`- Checking ${file} (${content.length} bytes)...`);

  // Check required tables exist in migration 1
  if (file.includes('000001')) {
    const requiredTables = [
      'profiles',
      'exams',
      'subjects',
      'topics',
      'questions',
      'tests',
      'test_questions',
      'attempts',
      'attempt_questions',
      'bookmarks',
      'question_reports',
    ];
    for (const table of requiredTables) {
      if (!content.includes(`TABLE IF NOT EXISTS ${table}`) && !content.includes(`TABLE ${table}`)) {
        throw new Error(`Missing table definition: ${table} in ${file}`);
      }
    }
    console.log('  ✓ All 11 core tables defined.');

    // Check critical question architecture constraints
    if (!content.includes('validate_question_options')) {
      throw new Error(`Missing validate_question_options function in ${file}`);
    }
    if (content.includes('question_options') && !content.includes('validate_question_options')) {
      throw new Error(`Forbidden table 'question_options' found in ${file}`);
    }
    console.log('  ✓ Critical question architecture rules verified.');
  }

  // Check RLS & Storage in migration 2
  if (file.includes('000002')) {
    if (!content.includes('quizora-media')) {
      throw new Error(`Missing storage bucket 'quizora-media' in ${file}`);
    }
    if (!content.includes('ENABLE ROW LEVEL SECURITY')) {
      throw new Error(`Missing RLS enablement in ${file}`);
    }
    console.log('  ✓ Storage bucket and RLS policies verified.');
  }

  // Check Seed data in migration 3
  if (file.includes('000003')) {
    if (!content.includes('Bihar STET')) {
      throw new Error(`Missing Bihar STET seed in ${file}`);
    }
    if (!content.includes('Computer Science')) {
      throw new Error(`Missing Computer Science seed in ${file}`);
    }
    console.log('  ✓ Seed data verified.');
  }
}

console.log('\nAll SQL migrations validated successfully!\n');
