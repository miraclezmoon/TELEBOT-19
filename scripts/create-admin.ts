import { createAdmin } from '../server/auth';
import { config } from 'dotenv';

config();

async function createDefaultAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const name = 'Admin User';

  try {
    const admin = await createAdmin(username, password, name);
    console.log('✅ Admin account created successfully!');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Please change the admin password after first login!');
    process.exit(0);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Admin account already exists');
    } else {
      console.error('❌ Error creating admin:', error.message);
    }
    process.exit(1);
  }
}

createDefaultAdmin();