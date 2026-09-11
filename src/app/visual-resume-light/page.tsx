import type { Metadata } from "next";

import { VisualResume } from "@/components/visual-resume";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Résumé — visual, light",
  robots: { index: false, follow: false },
};

export default function VisualResumeLightPage() {
  return <VisualResume tone="light" />;
}
