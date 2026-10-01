export const verificationLabels = {
  NONE: "Not reviewed",
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Needs changes",
};
export type ReviewStatus = keyof typeof verificationLabels;
export const verificationActions = [
  "VERIFY_RECIPE",
  "REJECT_VERIFICATION",
  "REOPEN_VERIFICATION",
  "CLEAR_VERIFICATION",
] as const;
export function decisionLabel(action: {
  action: string;
  previousVerificationStatus?: ReviewStatus | null;
  nextVerificationStatus?: ReviewStatus | null;
}) {
  if (action.previousVerificationStatus && action.nextVerificationStatus)
    return `${verificationLabels[action.previousVerificationStatus]} → ${verificationLabels[action.nextVerificationStatus]}`;
  return action.action === "VERIFY_RECIPE"
    ? "Verified"
    : "Changes requested / verification revoked";
}
