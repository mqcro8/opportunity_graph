import fs from "fs";
import path from "path";
import Markdown from "react-markdown";

export function MarkdownPage({
  file,
  title,
}: {
  file: string;
  title: string;
}) {
  const content = fs.readFileSync(path.join(process.cwd(), file), "utf8");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-medium">{title}</h1>
      <div className="prose">
        <Markdown>{content}</Markdown>
      </div>
    </div>
  );
}
