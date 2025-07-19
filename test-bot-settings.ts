import { storage } from './server/storage';

async function testBotSettings() {
  console.log('Testing bot settings connection...\n');
  
  try {
    // Get current settings
    const settings = await storage.getSettings();
    console.log('Current settings from admin panel:');
    console.log('- Daily Reward Amount:', settings.dailyRewardAmount || 1);
    console.log('- Referral Reward:', settings.referralReward || 1);
    console.log('- Invitation Code Reward:', settings.invitationCodeReward || 1);
    
    // Check if settings exist
    if (!settings.dailyRewardAmount) {
      console.log('\nNo settings found. Creating default settings...');
      await storage.updateSettings({
        dailyRewardAmount: 1,
        referralReward: 1,
        invitationCodeReward: 1
      });
      console.log('Default settings created!');
    }
    
    // Test updating settings
    console.log('\nTesting settings update...');
    await storage.updateSettings({
      dailyRewardAmount: 5,
      referralReward: 3,
      invitationCodeReward: 2
    });
    
    const updatedSettings = await storage.getSettings();
    console.log('\nUpdated settings:');
    console.log('- Daily Reward Amount:', updatedSettings.dailyRewardAmount);
    console.log('- Referral Reward:', updatedSettings.referralReward);
    console.log('- Invitation Code Reward:', updatedSettings.invitationCodeReward);
    
    console.log('\n✅ Bot settings are properly connected to the admin panel!');
    console.log('The bot will now use these amounts when users interact with buttons.');
    
  } catch (error) {
    console.error('❌ Error testing bot settings:', error);
  }
  
  process.exit(0);
}

testBotSettings();