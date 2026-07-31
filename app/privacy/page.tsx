import { MarkdownPage } from "@/components/markdown-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Opportunity graph",
};

export default function PrivacyPage() {
  return <MarkdownPage file="PRIVACY_POLICY.md" title="Privacy Policy" />;
}
