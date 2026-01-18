// Test script to check profile picture URL construction

// Simulate what the backend returns
const mockConversation = {
  partner: {
    _id: "696ccf7e2b987af030b0ffbc",
    username: "TestUser",
    profilePicture: "/uploads/profile-pictures/696c9d4e587a5f9901eb6eab_1768726503387.gif"
  }
};

console.log("=== PROFILE PICTURE URL TEST ===");
console.log("\n1. Backend returns:");
console.log("   profilePicture:", mockConversation.partner.profilePicture);

console.log("\n2. Current chat.html code (line 519):");
console.log("   Code: `<img src=\"${conv.partner.profilePicture}\">`");
console.log("   Result:", mockConversation.partner.profilePicture);

console.log("\n3. What it SHOULD be:");
console.log("   Code: `<img src=\"http://localhost:3000${conv.partner.profilePicture}\">`");
console.log("   Result: http://localhost:3000" + mockConversation.partner.profilePicture);

console.log("\n=== PROBLEM IDENTIFIED ===");
console.log("❌ chat.html line 519 is missing the base URL!");
console.log("❌ It uses: conv.partner.profilePicture");
console.log("✅ Should be: http://localhost:3000${conv.partner.profilePicture}");
