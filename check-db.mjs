import clientPromise, { getDb } from "./lib/db.js";

(async () => {
  try {
    const db = await getDb();

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(
      "Collections:",
      collections.map((c) => c.name),
    );

    // Check users collection
    const usersCollection = db.collection("users");
    const usersCount = await usersCollection.countDocuments();
    console.log("\nUsers count:", usersCount);

    // Get sample user document
    if (usersCount > 0) {
      const sampleUser = await usersCollection.findOne();
      console.log(
        "\nSample user document:",
        JSON.stringify(sampleUser, null, 2),
      );
    }

    // Check schema by looking at fields
    const allUsers = await usersCollection.find({}).limit(3).toArray();
    if (allUsers.length > 0) {
      console.log("\nFirst 3 users (fields only):");
      allUsers.forEach((u, i) => {
        console.log(`  User ${i + 1}:`, Object.keys(u).join(", "));
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
})();
