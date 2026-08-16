import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const TARGET_FILES = [
  "src/app/(admin)/contract-ocr/page.tsx",
  "src/app/(admin)/contract-ocr/[documentId]/page.tsx",
  "src/features/tenants/components/TenantInfoForm.tsx",
];

const DEPRECATED_PROPS: Record<string, Set<string>> = {
  Alert: new Set(["message"]),
  Input: new Set(["addonAfter"]),
  InputNumber: new Set(["addonAfter"]),
  Space: new Set(["direction"]),
};

function findDeprecatedAntdProps(filePath: string): string[] {
  const sourceText = readFileSync(resolve(process.cwd(), filePath), "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches: string[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const componentName = node.tagName.getText(sourceFile);
      const deprecatedProps = DEPRECATED_PROPS[componentName];

      if (deprecatedProps) {
        for (const attribute of node.attributes.properties) {
          if (ts.isJsxAttribute(attribute) && deprecatedProps.has(attribute.name.getText(sourceFile))) {
            const location = sourceFile.getLineAndCharacterOfPosition(attribute.getStart(sourceFile));
            matches.push(
              `${filePath}:${location.line + 1} <${componentName}> ${attribute.name.getText(sourceFile)}`,
            );
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return matches;
}

test("계약서 OCR 화면과 임차인 폼은 deprecated Ant Design prop을 사용하지 않는다", () => {
  const matches = TARGET_FILES.flatMap(findDeprecatedAntdProps);

  expect(matches).toEqual([]);
});
