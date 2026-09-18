import type { Metadata } from "next";

import { LinkedInCover } from "@/components/linkedin-cover";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "LinkedIn cover — light",
  robots: { index: false, follow: false },
};

export default function LinkedInCoverLightPage() {
  return <LinkedInCover tone="light" />;
}
