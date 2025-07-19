import { storage } from './server/storage';

async function testOnboarding() {
  console.log('🧪 Testing Onboarding System\n');
  
  try {
    // Get onboarding statistics
    const stats = await storage.getOnboardingStats();
    console.log('📊 Current Onboarding Statistics:');
    console.log(`   Total Users: ${stats.totalUsers}`);
    console.log(`   Completed Onboarding: ${stats.completedOnboarding}`);
    console.log(`   Average Step: ${stats.averageStep}`);
    console.log(`   Completion Rate: ${stats.totalUsers > 0 ? Math.round((stats.completedOnboarding / stats.totalUsers) * 100) : 0}%\n`);
    
    // List users and their onboarding status
    const users = await storage.getAllUsers();
    console.log('👥 User Onboarding Status:');
    console.log('─'.repeat(80));
    console.log('Username'.padEnd(20) + 'Telegram ID'.padEnd(15) + 'Completed'.padEnd(12) + 'Current Step'.padEnd(15) + 'Progress');
    console.log('─'.repeat(80));
    
    for (const user of users) {
      const progress = user.onboardingProgress ? JSON.parse(user.onboardingProgress) : {};
      const progressKeys = Object.keys(progress).length;
      
      console.log(
        (user.username || 'N/A').padEnd(20) +
        user.telegramId.padEnd(15) +
        (user.onboardingCompleted ? '✅ Yes' : '❌ No').padEnd(12) +
        `Step ${user.onboardingStep}`.padEnd(15) +
        `${progressKeys} actions`
      );
    }
    
    console.log('\n💡 To test onboarding with a new user:');
    console.log('   1. Open Telegram and search for @MDFCOIN_BOT');
    console.log('   2. Send /start command');
    console.log('   3. Choose "🎓 Start Tutorial" to begin the onboarding');
    console.log('   4. Follow the interactive tutorial steps\n');
    
    console.log('📱 For existing users to restart onboarding:');
    console.log('   - The bot will show a "Restart Tutorial" option in the main menu');
    console.log('   - Or you can manually reset a user\'s onboarding status in the database\n');
    
  } catch (error) {
    console.error('❌ Error testing onboarding:', error);
  }
  
  process.exit(0);
}

// Run the test
testOnboarding();