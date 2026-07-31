import { MarkdownPage } from "@/components/markdown-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Opportunity graph",
};

export default function TermsPage() {
  return <MarkdownPage file="TERMS_OF_SERVICE.md" title="Terms of Service" />;
}
