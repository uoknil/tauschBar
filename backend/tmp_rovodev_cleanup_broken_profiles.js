// Cleanup script for broken profile pictures
// This script checks all users and removes profilePicture references to files that don't exist

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tauschbar';

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  passwordHash: String,
  address: String,
  zip: String,
  profilePicture: String,
  warnings: Number,
  isBanned: Boolean,
  createdAt: Date
});

const User = mongoose.model('User', UserSchema);

async function cleanupBrokenProfilePictures() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Checking all users with profile pictures...');
    const usersWithPictures = await User.find({ 
      profilePicture: { $ne: null, $ne: '' } 
    });

    console.log(`📊 Found ${usersWithPictures.length} users with profile pictures set`);

    let fixedCount = 0;
    let okCount = 0;

    for (const user of usersWithPictures) {
      const picturePath = user.profilePicture;
      
      // Skip if profilePicture is somehow null or empty
      if (!picturePath || picturePath.trim() === '') {
        console.log(`  ⚠️  SKIPPED: ${user.username} - profilePicture is empty/null`);
        user.profilePicture = null;
        await user.save();
        fixedCount++;
        continue;
      }
      
      // Remove leading slash if present
      const relativePath = picturePath.startsWith('/') 
        ? picturePath.substring(1) 
        : picturePath;
      
      // Construct full file path
      const fullPath = path.join(__dirname, relativePath);
      
      // Check if file exists
      if (fs.existsSync(fullPath)) {
        console.log(`  ✅ OK: ${user.username} - ${picturePath}`);
        okCount++;
      } else {
        console.log(`  ❌ BROKEN: ${user.username} - ${picturePath} (file not found)`);
        console.log(`     Fixing: Setting profilePicture to null...`);
        
        user.profilePicture = null;
        await user.save();
        
        console.log(`     ✅ Fixed!`);
        fixedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ OK: ${okCount} users`);
    console.log(`   🔧 Fixed: ${fixedCount} users`);
    console.log(`   📝 Total checked: ${usersWithPictures.length} users`);

    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupBrokenProfilePictures();
