import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";

export async function checkUserCredits(user) {
  // 1. GUEST MODE LOGIC
  if (!user) {
    const guestId = localStorage.getItem("imagynex_guest_id") || "guest_" + Math.random().toString(36).substring(7);
    localStorage.setItem("imagynex_guest_id", guestId);

    const guestRef = doc(db, "usage_tracking", guestId);
    const guestSnap = await getDoc(guestRef);

    if (!guestSnap.exists()) {
      await setDoc(guestRef, { count: 0, type: "guest" });
      return { allowed: true, remaining: 5 };
    }

    if (guestSnap.data().count >= 5) {
      return { allowed: false, message: "Guest limit reached! Please Sign In." };
    }
    return { allowed: true, remaining: 5 - guestSnap.data().count };
  }

  // 2. SIGNED IN USER LOGIC
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const today = new Date().toDateString();

  if (!userSnap.exists()) {
    await setDoc(userRef, { 
        dailyLimit: 3, 
        lastUsed: today, 
        countToday: 0,
        isTopCreator: false 
    });
    return { allowed: true, remaining: 3 };
  }

  const userData = userSnap.data();
  // Reset count if it's a new day
  if (userData.lastUsed !== today) {
    await updateDoc(userRef, { countToday: 0, lastUsed: today });
    return { allowed: true, remaining: userData.dailyLimit };
  }

  if (userData.countToday >= userData.dailyLimit) {
    return { allowed: false, message: "Daily limit reached! Back tomorrow." };
  }

  return { allowed: true, remaining: userData.dailyLimit - userData.countToday };
}