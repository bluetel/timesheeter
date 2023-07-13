import NextAuth from "next-auth";
import { authOptions } from "@timesheeter/web/server/auth";

export default NextAuth(authOptions);
