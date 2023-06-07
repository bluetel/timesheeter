import NextAuth from "next-auth";
import { authOptions } from "@timesheeter/app/server/auth";

export default NextAuth(authOptions);
