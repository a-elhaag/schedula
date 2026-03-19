import clientPromise from "../lib/db.js";

const db = (await clientPromise).db("schedula");
const users = db.collection("users");

const before = {
  missingEmailVerifiedAt: await users.countDocuments({
    email_verified_at: { $exists: false },
  }),
  missingPasswordResetToken: await users.countDocuments({
    password_reset_token: { $exists: false },
  }),
  missingPasswordResetExpiresAt: await users.countDocuments({
    password_reset_expires_at: { $exists: false },
  }),
  missingEmailVerifyToken: await users.countDocuments({
    email_verify_token: { $exists: false },
  }),
  missingInviteToken: await users.countDocuments({
    invite_token: { $exists: false },
  }),
};

const result = await users.updateMany({}, [
  {
    $set: {
      invited_by: { $ifNull: ["$invited_by", null] },
      invite_token: { $ifNull: ["$invite_token", null] },
      invite_expires_at: { $ifNull: ["$invite_expires_at", null] },
      email_verify_token: { $ifNull: ["$email_verify_token", null] },
      email_verify_expires_at: { $ifNull: ["$email_verify_expires_at", null] },
      password_reset_token: { $ifNull: ["$password_reset_token", null] },
      password_reset_expires_at: {
        $ifNull: ["$password_reset_expires_at", null],
      },
      refresh_token_hash: { $ifNull: ["$refresh_token_hash", null] },
      email_verified_at: {
        $cond: [
          {
            $and: [
              { $eq: ["$invite_status", "joined"] },
              {
                $or: [
                  { $eq: [{ $type: "$email_verified_at" }, "missing"] },
                  { $eq: ["$email_verified_at", null] },
                ],
              },
            ],
          },
          "$created_at",
          { $ifNull: ["$email_verified_at", null] },
        ],
      },
    },
  },
]);

const after = {
  missingEmailVerifiedAt: await users.countDocuments({
    email_verified_at: { $exists: false },
  }),
  missingPasswordResetToken: await users.countDocuments({
    password_reset_token: { $exists: false },
  }),
  missingPasswordResetExpiresAt: await users.countDocuments({
    password_reset_expires_at: { $exists: false },
  }),
  missingEmailVerifyToken: await users.countDocuments({
    email_verify_token: { $exists: false },
  }),
  missingInviteToken: await users.countDocuments({
    invite_token: { $exists: false },
  }),
};

console.log(
  JSON.stringify(
    {
      before,
      update: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
      after,
    },
    null,
    2,
  ),
);
