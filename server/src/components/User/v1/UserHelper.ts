export const formatUserProfile = (user: any) => {
  return {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    role: user.role,
    language: 'en',
    is_verified: user.isVerified,
    verification_status: user.verificationStatus,
    verification_note: user.verificationNote,
    verification_doc: user.verificationDoc,
    created_at: user.createdAt
  };
};
export default { formatUserProfile };
