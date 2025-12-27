/**
 * Seed Users Utility
 *
 * This script populates the Firestore 'users' collection with existing
 * Firebase Auth users. Run this once to make all team members available
 * for task assignment.
 *
 * Usage (from browser console after importing):
 *   import { seedUsers } from './utils/seedUsers';
 *   seedUsers();
 *
 * Or use the seedUsersFromApp() function which is exposed on window.
 */

import * as fb from '../services/firebase';
import { TeamMember } from '../types';

// Add your existing Firebase Auth users here
// Get the UIDs from Firebase Console > Authentication > Users
const EXISTING_USERS: Omit<TeamMember, 'lastSignIn'>[] = [
  {
    uid: 'UM3PibxbHQY0VR5xxM03nFpEfFM2',  // celiayen95@gmail.com - UPDATE with full UID
    displayName: 'Celia Yen',
    email: 'celiayen95@gmail.com',
    photoURL: null,
  },
  {
    uid: 'YUlo1uwLImSwxxD6OX4mlWFWMmv2', // puiyin6681@gmail.com - UPDATE with full UID
    displayName: 'Pui Yin',
    email: 'puiyin6681@gmail.com',
    photoURL: null,
  }
];

/**
 * Seeds the Firestore users collection with predefined users.
 * Only adds users that don't already exist (won't overwrite).
 */
export async function seedUsers(): Promise<void> {
  if (!fb.db) {
    console.error('❌ Firestore not initialized');
    return;
  }

  console.log('🌱 Starting user seed...');
  let added = 0;
  let skipped = 0;

  for (const user of EXISTING_USERS) {
    try {
      const userDoc: TeamMember = {
        ...user,
        lastSignIn: 0, // Will be updated when they actually sign in
      };

      // Use set with merge to avoid overwriting existing data
      await fb.setDoc(fb.doc(fb.db, 'users', user.uid), userDoc, { merge: true });
      console.log(`✅ Added: ${user.email}`);
      added++;
    } catch (error) {
      console.error(`❌ Failed to add ${user.email}:`, error);
      skipped++;
    }
  }

  console.log(`🌱 Seed complete! Added: ${added}, Skipped/Failed: ${skipped}`);
}

/**
 * Update a user's photoURL in Firestore.
 * Usage: updateUserPhoto('uid-here', 'https://photo-url-here')
 *
 * Get photoURLs from Firebase Console > Authentication > Users > click user > Photo URL
 */
export async function updateUserPhoto(uid: string, photoURL: string): Promise<void> {
  if (!fb.db) {
    console.error('❌ Firestore not initialized');
    return;
  }

  try {
    await fb.updateDoc(fb.doc(fb.db, 'users', uid), { photoURL });
    console.log(`✅ Updated photoURL for ${uid}`);
  } catch (error) {
    console.error(`❌ Failed to update photoURL:`, error);
  }
}

/**
 * Batch update multiple users' photoURLs.
 * Usage: updateUserPhotos({ 'uid1': 'url1', 'uid2': 'url2' })
 */
export async function updateUserPhotos(updates: Record<string, string>): Promise<void> {
  if (!fb.db) {
    console.error('❌ Firestore not initialized');
    return;
  }

  console.log('📸 Updating user photos...');
  for (const [uid, photoURL] of Object.entries(updates)) {
    try {
      await fb.updateDoc(fb.doc(fb.db, 'users', uid), { photoURL });
      console.log(`✅ Updated: ${uid}`);
    } catch (error) {
      console.error(`❌ Failed: ${uid}`, error);
    }
  }
  console.log('📸 Done updating photos!');
}

/**
 * Sync photoURLs from projects to users collection.
 * Reads lastEditedAvatar from all projects and updates the corresponding user records.
 * Usage: syncUserPhotosFromProjects()
 */
export async function syncUserPhotosFromProjects(): Promise<void> {
  if (!fb.db) {
    console.error('❌ Firestore not initialized');
    return;
  }

  console.log('🔄 Syncing user photos from projects...');

  try {
    // Get all projects
    const projectsRef = fb.collection(fb.db, 'projects');
    const projectsSnap = await fb.getDocs(projectsRef);

    // Build a map of displayName -> photoURL from ALL project data
    const photosByName: Record<string, string> = {};
    const photosByEmail: Record<string, string> = {};

    projectsSnap.forEach((docSnap) => {
      const data = docSnap.data();

      // Collect from lastEditedBy/lastEditedAvatar
      if (data.lastEditedBy && data.lastEditedAvatar) {
        photosByName[data.lastEditedBy] = data.lastEditedAvatar;
      }

      // Collect from ownerName/ownerAvatar
      if (data.ownerName && data.ownerAvatar) {
        photosByName[data.ownerName] = data.ownerAvatar;
      }

      // Collect from messages - most reliable source
      if (data.messages && Array.isArray(data.messages)) {
        data.messages.forEach((msg: any) => {
          if (msg.role === 'user' && msg.photoURL && msg.displayName) {
            photosByName[msg.displayName] = msg.photoURL;
          }
        });
      }
    });

    console.log('\n📷 Found photos for these names:');
    Object.entries(photosByName).forEach(([name, url]) => {
      console.log(`  - ${name}: ${url.substring(0, 60)}...`);
    });

    // Get all users
    const usersRef = fb.collection(fb.db, 'users');
    const usersSnap = await fb.getDocs(usersRef);

    const updates: { uid: string; displayName: string; photoURL: string }[] = [];

    // For each user without a photo, find their photo by displayName or email
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      if (userData.photoURL) {
        console.log(`✓ ${userData.displayName || userData.email} already has photo`);
        continue;
      }

      // Try to find photo by displayName
      let foundPhoto: string | null = null;

      if (userData.displayName && photosByName[userData.displayName]) {
        foundPhoto = photosByName[userData.displayName];
      }

      // Also try partial match (first name)
      if (!foundPhoto && userData.displayName) {
        const firstName = userData.displayName.split(' ')[0];
        for (const [name, photo] of Object.entries(photosByName)) {
          if (name.includes(firstName) || firstName.includes(name.split(' ')[0])) {
            foundPhoto = photo;
            console.log(`  📎 Matched "${userData.displayName}" with "${name}"`);
            break;
          }
        }
      }

      if (foundPhoto) {
        updates.push({
          uid: userDoc.id,
          displayName: userData.displayName || userData.email,
          photoURL: foundPhoto
        });
      } else {
        console.log(`⚠️ No photo found for ${userData.displayName || userData.email}`);
      }
    }

    // Show what we found
    console.log('\n📋 Will update these users:');
    updates.forEach(u => {
      console.log(`  - ${u.displayName}: ${u.photoURL.substring(0, 50)}...`);
    });

    if (updates.length === 0) {
      console.log('No photos to update!');
      return;
    }

    // Apply updates
    console.log(`\n🔄 Updating ${updates.length} users...`);
    for (const update of updates) {
      try {
        await fb.updateDoc(fb.doc(fb.db, 'users', update.uid), { photoURL: update.photoURL });
        console.log(`✅ Updated: ${update.displayName}`);
      } catch (error) {
        console.error(`❌ Failed to update ${update.displayName}:`, error);
      }
    }

    console.log('🎉 Sync complete!');
  } catch (error) {
    console.error('❌ Error syncing photos:', error);
  }
}

/**
 * Debug function to show all available photos and users without photos
 * Usage: debugUserPhotos()
 */
export async function debugUserPhotos(): Promise<void> {
  if (!fb.db) {
    console.error('❌ Firestore not initialized');
    return;
  }

  console.log('🔍 Debugging user photos...\n');

  // Get all projects
  const projectsRef = fb.collection(fb.db, 'projects');
  const projectsSnap = await fb.getDocs(projectsRef);

  // Collect ALL photos with their source
  const allPhotos: { name: string; photo: string; source: string }[] = [];

  projectsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const projectName = data.projectName || docSnap.id;

    if (data.lastEditedBy && data.lastEditedAvatar) {
      allPhotos.push({ name: data.lastEditedBy, photo: data.lastEditedAvatar, source: `lastEditedBy in "${projectName}"` });
    }

    if (data.ownerName && data.ownerAvatar) {
      allPhotos.push({ name: data.ownerName, photo: data.ownerAvatar, source: `ownerName in "${projectName}"` });
    }

    if (data.messages && Array.isArray(data.messages)) {
      data.messages.forEach((msg: any, i: number) => {
        if (msg.role === 'user' && msg.photoURL && msg.displayName) {
          allPhotos.push({ name: msg.displayName, photo: msg.photoURL, source: `message[${i}] in "${projectName}"` });
        }
      });
    }
  });

  // Dedupe by name, keeping unique photos
  const uniqueByName: Record<string, { photo: string; source: string }> = {};
  allPhotos.forEach(p => {
    if (!uniqueByName[p.name]) {
      uniqueByName[p.name] = { photo: p.photo, source: p.source };
    }
  });

  console.log('📷 ALL PHOTOS FOUND IN PROJECTS:');
  console.log('================================');
  Object.entries(uniqueByName).forEach(([name, data]) => {
    console.log(`  "${name}" -> ${data.photo.substring(0, 50)}...`);
    console.log(`     Source: ${data.source}`);
  });

  // Get all users
  const usersRef = fb.collection(fb.db, 'users');
  const usersSnap = await fb.getDocs(usersRef);

  console.log('\n👥 USERS WITHOUT PHOTOS:');
  console.log('========================');
  const usersWithoutPhotos: { uid: string; displayName: string; email: string }[] = [];

  usersSnap.forEach((userDoc) => {
    const userData = userDoc.data();
    if (!userData.photoURL) {
      usersWithoutPhotos.push({
        uid: userDoc.id,
        displayName: userData.displayName || '(no displayName)',
        email: userData.email || '(no email)'
      });
      console.log(`  UID: ${userDoc.id}`);
      console.log(`  displayName: "${userData.displayName}"`);
      console.log(`  email: "${userData.email}"`);
      console.log('');
    }
  });

  // Suggest matches
  console.log('\n💡 SUGGESTED MANUAL UPDATES:');
  console.log('============================');
  console.log('Run these commands to update photos:\n');

  usersWithoutPhotos.forEach(user => {
    // Find best match
    let bestMatch: { name: string; photo: string } | null = null;
    for (const [name, data] of Object.entries(uniqueByName)) {
      const userFirst = user.displayName.split(' ')[0].toLowerCase();
      const photoFirst = name.split(' ')[0].toLowerCase();
      if (userFirst === photoFirst || name.toLowerCase().includes(userFirst) || user.displayName.toLowerCase().includes(photoFirst)) {
        bestMatch = { name, photo: data.photo };
        break;
      }
    }

    if (bestMatch) {
      console.log(`// ${user.displayName} -> matched with "${bestMatch.name}"`);
      console.log(`updateUserPhoto('${user.uid}', '${bestMatch.photo}')\n`);
    } else {
      console.log(`// ${user.displayName} -> NO MATCH FOUND, pick manually from above list`);
      console.log(`// updateUserPhoto('${user.uid}', 'PASTE_PHOTO_URL_HERE')\n`);
    }
  });
}

// Expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).seedUsers = seedUsers;
  (window as any).updateUserPhoto = updateUserPhoto;
  (window as any).updateUserPhotos = updateUserPhotos;
  (window as any).syncUserPhotosFromProjects = syncUserPhotosFromProjects;
  (window as any).debugUserPhotos = debugUserPhotos;
}
