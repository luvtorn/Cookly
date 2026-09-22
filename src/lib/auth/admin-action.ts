import "server-only";
import { actionUser } from "./user-action";

export async function actionAdmin() {
  const user = await actionUser();
  if (user.role !== "ADMIN") throw new Error("Access denied.");
  return user;
}
